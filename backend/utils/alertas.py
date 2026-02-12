from sqlalchemy.orm import Session
from datetime import datetime, date
from backend.models import Agendamento, Prospeccao, Usuario, StatusAgendamento
from backend.models.cronograma import CronogramaEvento
from backend.models.empresas import Empresa

def agregar_todos_alertas(db: Session, usuario: Usuario):
    hoje = datetime.now().date()
    
    # 1. Agendamentos (Ligações)
    agendamentos_query = db.query(Agendamento).join(Prospeccao)
    if usuario.tipo != "admin":
        agendamentos_query = agendamentos_query.filter(Prospeccao.consultor_id == usuario.id)
    
    agendamentos_pendentes = agendamentos_query.filter(Agendamento.status == StatusAgendamento.pendente).all()
    
    # 2. Próximas Etapas (Empresas)
    empresas_query = db.query(Empresa)
    # Admin vê tudo, consultor vê o que lhe cabe (se implementado)
    proximas_etapas = empresas_query.filter(Empresa.data_proxima_etapa.isnot(None)).all()
    
    # 3. Cronograma
    cronograma_query = db.query(CronogramaEvento).join(Empresa, isouter=True)
    if usuario.tipo != "admin":
        cronograma_query = cronograma_query.filter(CronogramaEvento.consultor_id == usuario.id)
    
    eventos_cronograma = cronograma_query.all()
    
    # Agregação
    lista_all = []
    
    # Helper para converter Agendamentos
    for a in agendamentos_pendentes:
        dt = a.data_agendada
        lista_all.append({
            "id": f"agend_{a.id}",
            "tipo": "ligacao",
            "data": dt.isoformat() if hasattr(dt, 'isoformat') else str(dt),
            "titulo": a.prospeccao.empresa.empresa if a.prospeccao and a.prospeccao.empresa else "Desconhecido",
            "descricao": f"Ligação Agendada: {a.observacoes or 'Sem observações'}",
            "empresa_id": a.prospeccao.empresa_id if a.prospeccao else None,
            "data_objeto": dt
        })
        
    # Helper para converter Próximas Etapas
    for e in proximas_etapas:
        dt = e.data_proxima_etapa
        lista_all.append({
            "id": f"etapa_{e.id}",
            "tipo": "etapa",
            "data": dt.isoformat() if hasattr(dt, 'isoformat') else str(dt),
            "titulo": e.empresa,
            "descricao": f"Próxima Etapa: {e.proxima_etapa}",
            "empresa_id": e.id,
            "data_objeto": dt
        })
        
    # Helper para converter Cronograma
    for c in eventos_cronograma:
        dt = c.data
        lista_all.append({
            "id": f"crono_{c.id}",
            "tipo": "cronograma",
            "data": dt.isoformat() if hasattr(dt, 'isoformat') else str(dt),
            "titulo": c.empresa.empresa if c.empresa else (c.sigla_empresa or "Evento Cronograma"),
            "descricao": f"{c.titulo or 'Atividade'}: {c.descricao or ''}",
            "empresa_id": c.empresa_id,
            "data_objeto": dt
        })

    # Separar em categorias baseadas na data
    vencidos = []
    hoje_list = []
    futuros = []
    
    for item in lista_all:
        try:
            val = item['data_objeto']
            item_dt = val.date() if isinstance(val, datetime) else val
            
            # Remover campo de ajuda para o JSON
            clean_item = {k: v for k, v in item.items() if k != 'data_objeto'}
            
            if item_dt < hoje:
                vencidos.append(clean_item)
            elif item_dt == hoje:
                hoje_list.append(clean_item)
            else:
                futuros.append(clean_item)
        except:
            futuros.append(item) 

    return {
        "vencidos": vencidos,
        "hoje": hoje_list,
        "futuros": futuros
    }
