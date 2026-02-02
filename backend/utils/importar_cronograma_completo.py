"""
Script para importar cronograma da planilha Excel
Executa via banco de dados diretamente (não via API)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import openpyxl
from datetime import datetime
from sqlalchemy.orm import Session
from backend.database import SessionLocal, engine, Base
from backend.models import Usuario
from backend.models.cronograma import CronogramaEvento, CategoriaEvento, PeriodoEvento
from backend.models.usuarios import TipoUsuario
from backend.auth.security import obter_hash_senha

CONSULTORES_REAIS = [
    "André Shiguemitsu Aoki",
    "Fernando Luiz de Figueredo",
    "Leandro Silva",
    "Lucas Azimovas",
    "Marcello Figueiredo",
    "Matheus Fernando",
    "Rafael Paula dos Santos",
    "Ramon Silvati",
    "Ricardo Ciuccio",
]

NIF_MAP = {
    "André Shiguemitsu Aoki": "SN-1081413",
    "Fernando Luiz de Figueredo": "SN-1079550",
    "Leandro Silva": "SN-1079636",
    "Lucas Azimovas": "SN-1079217",
    "Marcello Figueiredo": "SN-1073239",
    "Matheus Fernando": "SN-1097608",
    "Rafael Paula dos Santos": "SN-1100339",
    "Ramon Silvati": "SN-1079234",
    "Ricardo Ciuccio": "SN-1071293",
}

def gerar_email(nome):
    """Gera email a partir do nome"""
    nome_limpo = nome.lower().strip()
    nome_limpo = nome_limpo.replace(" ", ".").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    nome_limpo = nome_limpo.replace("ã", "a").replace("õ", "o").replace("ç", "c").replace("ê", "e").replace("â", "a")
    return f"{nome_limpo}@nucleo.com"

def extrair_categoria(evento_str):
    """Extrai a categoria do evento (primeira letra antes do '-')"""
    if not evento_str or not isinstance(evento_str, str):
        return None
    
    evento_str = evento_str.strip()
    if '-' in evento_str:
        cat = evento_str.split('-')[0].strip().upper()
        if cat in ['C', 'K', 'F', 'M', 'T', 'P', 'O']:
            return cat
    return 'O'

def extrair_sigla(evento_str):
    """Extrai a sigla da empresa do evento"""
    if not evento_str or not isinstance(evento_str, str):
        return None
    
    evento_str = evento_str.strip()
    if '-' in evento_str:
        parts = evento_str.split('-', 1)
        if len(parts) > 1:
            return parts[1].strip()
    return evento_str

def importar_consultores(db: Session):
    """Importa consultores da lista predefinida"""
    print("\n=== IMPORTANDO CONSULTORES ===")
    
    consultores_criados = 0
    consultores_existentes = 0
    consultor_ids = {}
    
    for nome in CONSULTORES_REAIS:
        email = gerar_email(nome)
        nif = NIF_MAP.get(nome, "")
        
        consultor = db.query(Usuario).filter(Usuario.email == email).first()
        
        if consultor:
            print(f"  [EXISTE] {nome} ({email})")
            consultores_existentes += 1
            consultor_ids[nome] = consultor.id
        else:
            novo_consultor = Usuario(
                nome=nome,
                email=email,
                senha_hash=obter_hash_senha("123456"),
                tipo=TipoUsuario.consultor,
                informacoes_basicas=f"NIF: {nif}"
            )
            db.add(novo_consultor)
            db.commit()
            db.refresh(novo_consultor)
            
            print(f"  [CRIADO] {nome} ({email}) - ID: {novo_consultor.id}")
            consultores_criados += 1
            consultor_ids[nome] = novo_consultor.id
    
    print(f"\nResumo: {consultores_criados} criados, {consultores_existentes} já existiam")
    return consultor_ids

def importar_eventos(db: Session, consultor_ids: dict, arquivo_excel: str):
    """Importa eventos da planilha Excel"""
    print("\n=== IMPORTANDO EVENTOS DO CRONOGRAMA ===")
    
    wb = openpyxl.load_workbook(arquivo_excel, read_only=True, data_only=True)
    ws = wb['CRONOGRAMA']
    
    all_rows = list(ws.iter_rows(values_only=True))
    
    date_row = all_rows[3]
    
    eventos_criados = 0
    eventos_ignorados = 0
    eventos_por_consultor = {}
    
    categoria_map = {
        'C': CategoriaEvento.consultoria,
        'K': CategoriaEvento.kickoff,
        'F': CategoriaEvento.reuniao_final,
        'M': CategoriaEvento.mentoria,
        'T': CategoriaEvento.diagnostico,
        'P': CategoriaEvento.programado,
        'O': CategoriaEvento.outros,
    }
    
    periodo_map = {
        'M': PeriodoEvento.manha,
        'T': PeriodoEvento.tarde,
        'D': PeriodoEvento.dia_todo,
    }
    
    for row_idx in range(12, len(all_rows)):
        row = all_rows[row_idx]
        
        if not row[1] or not isinstance(row[1], str):
            continue
        
        nome = row[1].strip()
        
        if nome not in CONSULTORES_REAIS:
            continue
        
        periodo_str = row[3] if row[3] else 'D'
        consultor_id = consultor_ids.get(nome)
        
        if not consultor_id:
            print(f"  [AVISO] Consultor não encontrado: {nome}")
            continue
        
        for col_idx in range(4, min(len(row), len(date_row))):
            evento_str = row[col_idx]
            data = date_row[col_idx]
            
            if not evento_str or not isinstance(evento_str, str):
                continue
            
            evento_str = evento_str.strip()
            if not evento_str:
                continue
            
            if not data or not isinstance(data, datetime):
                continue
            
            categoria_str = extrair_categoria(evento_str)
            sigla = extrair_sigla(evento_str)
            
            categoria = categoria_map.get(categoria_str, CategoriaEvento.outros)
            periodo = periodo_map.get(periodo_str, PeriodoEvento.dia_todo)
            
            evento_existente = db.query(CronogramaEvento).filter(
                CronogramaEvento.data == data.date(),
                CronogramaEvento.consultor_id == consultor_id,
                CronogramaEvento.periodo == periodo,
                CronogramaEvento.sigla_empresa == sigla
            ).first()
            
            if evento_existente:
                eventos_ignorados += 1
                continue
            
            novo_evento = CronogramaEvento(
                data=data.date(),
                categoria=categoria,
                periodo=periodo,
                sigla_empresa=sigla,
                consultor_id=consultor_id,
                titulo=evento_str
            )
            db.add(novo_evento)
            eventos_criados += 1
            
            if nome not in eventos_por_consultor:
                eventos_por_consultor[nome] = 0
            eventos_por_consultor[nome] += 1
            
            if eventos_criados % 100 == 0:
                db.commit()
                print(f"  Progresso: {eventos_criados} eventos criados...")
    
    db.commit()
    
    print(f"\n=== RESUMO DA IMPORTAÇÃO ===")
    print(f"Eventos criados: {eventos_criados}")
    print(f"Eventos ignorados (duplicados): {eventos_ignorados}")
    print(f"\nEventos por consultor:")
    for nome, count in sorted(eventos_por_consultor.items()):
        print(f"  - {nome}: {count}")
    
    return eventos_criados

def main():
    arquivo_excel = "attached_assets/CRONOGRAMA 2.0 (4) (1)_1764590404819.xlsx"
    
    if not os.path.exists(arquivo_excel):
        print(f"Erro: Arquivo não encontrado: {arquivo_excel}")
        return
    
    print("=" * 50)
    print("IMPORTAÇÃO DO CRONOGRAMA")
    print("=" * 50)
    
    db = SessionLocal()
    
    try:
        consultor_ids = importar_consultores(db)
        
        eventos_criados = importar_eventos(db, consultor_ids, arquivo_excel)
        
        print("\n" + "=" * 50)
        print("IMPORTAÇÃO CONCLUÍDA COM SUCESSO!")
        print("=" * 50)
        
    except Exception as e:
        print(f"\nErro durante importação: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
