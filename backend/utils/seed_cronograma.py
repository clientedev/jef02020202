"""
Seed do cronograma - importa consultores e eventos do cronograma
Executado automaticamente no startup se não houver eventos
"""
from sqlalchemy.orm import Session
from datetime import datetime
from backend.models import Usuario
from backend.models.cronograma import CronogramaEvento, CategoriaEvento, PeriodoEvento
from backend.models.usuarios import TipoUsuario
from backend.auth.security import obter_hash_senha

CONSULTORES_CRONOGRAMA = [
    {"nome": "André Shiguemitsu Aoki", "nif": "SN-1081413"},
    {"nome": "Fernando Luiz de Figueredo", "nif": "SN-1079550"},
    {"nome": "Leandro Silva", "nif": "SN-1079636"},
    {"nome": "Lucas Azimovas", "nif": "SN-1079217"},
    {"nome": "Marcello Figueiredo", "nif": "SN-1073239"},
    {"nome": "Matheus Fernando", "nif": "SN-1097608"},
    {"nome": "Rafael Paula dos Santos", "nif": "SN-1100339"},
    {"nome": "Ramon Silvati", "nif": "SN-1079234"},
    {"nome": "Ricardo Ciuccio", "nif": "SN-1071293"},
]

EVENTOS_CRONOGRAMA = [
    {"consultor": "André Shiguemitsu Aoki", "data": "2024-12-02", "periodo": "M", "evento": "O-SENAI"},
    {"consultor": "André Shiguemitsu Aoki", "data": "2024-12-03", "periodo": "M", "evento": "O-SENAI"},
    {"consultor": "André Shiguemitsu Aoki", "data": "2024-12-04", "periodo": "M", "evento": "O-SENAI"},
    {"consultor": "André Shiguemitsu Aoki", "data": "2024-12-05", "periodo": "M", "evento": "O-SENAI"},
    {"consultor": "André Shiguemitsu Aoki", "data": "2024-12-06", "periodo": "M", "evento": "O-SENAI"},
    {"consultor": "André Shiguemitsu Aoki", "data": "2024-12-09", "periodo": "M", "evento": "O-SENAI"},
    {"consultor": "André Shiguemitsu Aoki", "data": "2024-12-10", "periodo": "M", "evento": "O-SENAI"},
    {"consultor": "André Shiguemitsu Aoki", "data": "2024-12-11", "periodo": "M", "evento": "O-SENAI"},
    {"consultor": "André Shiguemitsu Aoki", "data": "2024-12-12", "periodo": "M", "evento": "O-SENAI"},
    {"consultor": "André Shiguemitsu Aoki", "data": "2024-12-13", "periodo": "M", "evento": "O-SENAI"},
]

def gerar_email(nome: str) -> str:
    nome_limpo = nome.lower().strip()
    nome_limpo = nome_limpo.replace(" ", ".").replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    nome_limpo = nome_limpo.replace("ã", "a").replace("õ", "o").replace("ç", "c").replace("ê", "e").replace("â", "a")
    return f"{nome_limpo}@nucleo.com"

def criar_consultores_cronograma(db: Session) -> dict:
    """Cria os consultores do cronograma se não existirem"""
    consultor_ids = {}
    
    for c in CONSULTORES_CRONOGRAMA:
        nome = c["nome"]
        email = gerar_email(nome)
        
        consultor = db.query(Usuario).filter(Usuario.email == email).first()
        
        if consultor:
            consultor_ids[nome] = consultor.id
        else:
            novo = Usuario(
                nome=nome,
                email=email,
                senha_hash=obter_hash_senha("123456"),
                tipo=TipoUsuario.consultor,
                informacoes_basicas=f"NIF: {c['nif']}"
            )
            db.add(novo)
            db.commit()
            db.refresh(novo)
            consultor_ids[nome] = novo.id
            print(f"  ✓ Consultor criado: {nome}")
    
    return consultor_ids

def importar_cronograma_excel(db: Session, consultor_ids: dict) -> int:
    """Importa eventos do cronograma a partir do arquivo Excel"""
    import os
    
    arquivo_excel = "attached_assets/CRONOGRAMA 2.0 (4) (1)_1764590404819.xlsx"
    
    if not os.path.exists(arquivo_excel):
        print(f"  ⚠️ Arquivo Excel não encontrado: {arquivo_excel}")
        return 0
    
    try:
        import openpyxl
    except ImportError:
        print("  ⚠️ openpyxl não instalado, pulando importação Excel")
        return 0
    
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
    
    consultores_validos = set(consultor_ids.keys())
    
    wb = openpyxl.load_workbook(arquivo_excel, read_only=True, data_only=True)
    ws = wb['CRONOGRAMA']
    all_rows = list(ws.iter_rows(values_only=True))
    date_row = all_rows[3]
    
    eventos_criados = 0
    
    for row_idx in range(12, len(all_rows)):
        row = all_rows[row_idx]
        
        if not row[1] or not isinstance(row[1], str):
            continue
        
        nome = row[1].strip()
        if nome not in consultores_validos:
            continue
        
        periodo_str = row[3] if row[3] else 'D'
        consultor_id = consultor_ids.get(nome)
        
        if not consultor_id:
            continue
        
        for col_idx in range(4, min(len(row), len(date_row))):
            evento_str = row[col_idx]
            data = date_row[col_idx]
            
            if not evento_str or not isinstance(evento_str, str):
                continue
            
            evento_str = evento_str.strip()
            if not evento_str or not data or not isinstance(data, datetime):
                continue
            
            cat_str = evento_str.split('-')[0].strip().upper() if '-' in evento_str else 'O'
            sigla = evento_str.split('-', 1)[1].strip() if '-' in evento_str else evento_str
            
            categoria = categoria_map.get(cat_str, CategoriaEvento.outros)
            periodo = periodo_map.get(periodo_str, PeriodoEvento.dia_todo)
            
            existe = db.query(CronogramaEvento).filter(
                CronogramaEvento.data == data.date(),
                CronogramaEvento.consultor_id == consultor_id,
                CronogramaEvento.periodo == periodo,
                CronogramaEvento.sigla_empresa == sigla
            ).first()
            
            if existe:
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
            
            if eventos_criados % 500 == 0:
                db.commit()
                print(f"  Progresso: {eventos_criados} eventos...")
    
    db.commit()
    return eventos_criados

def seed_cronograma(db: Session):
    """Função principal para seed do cronograma"""
    total_eventos = db.query(CronogramaEvento).count()
    
    if total_eventos > 100:
        print(f"✓ Cronograma já possui {total_eventos} eventos, pulando importação")
        return
    
    print("🔄 Importando cronograma...")
    
    consultor_ids = criar_consultores_cronograma(db)
    print(f"  ✓ {len(consultor_ids)} consultores verificados/criados")
    
    eventos_criados = importar_cronograma_excel(db, consultor_ids)
    
    if eventos_criados > 0:
        print(f"  ✓ {eventos_criados} eventos do cronograma importados")
    else:
        print("  ⚠️ Nenhum evento importado (arquivo não encontrado ou já existem)")
