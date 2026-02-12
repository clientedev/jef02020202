from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from backend.database import get_db
from backend.models import Empresa, Prospeccao, Agendamento, Usuario, StatusAgendamento
from backend.auth.security import obter_usuario_atual

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
def obter_estatisticas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    hoje = datetime.now().date()
    hoje_inicio = datetime.combine(hoje, datetime.min.time())
    hoje_fim = datetime.combine(hoje, datetime.max.time())
    
    if usuario.tipo == "admin":
        total_empresas = db.query(func.count(Empresa.id)).scalar()
        total_prospeccoes = db.query(func.count(Prospeccao.id)).scalar()
        
        prospeccoes_query = db.query(Prospeccao)
        agendamentos_query = db.query(Agendamento)
        empresas_query = db.query(Empresa)
    else:
        from backend.models import AtribuicaoEmpresa
        empresas_atribuidas_ids = db.query(AtribuicaoEmpresa.empresa_id).filter(
            AtribuicaoEmpresa.consultor_id == usuario.id
        ).all()
        empresas_ids = [emp[0] for emp in empresas_atribuidas_ids]
        
        total_empresas = len(empresas_ids)
        total_prospeccoes = db.query(func.count(Prospeccao.id)).filter(
            Prospeccao.consultor_id == usuario.id
        ).scalar()
        
        prospeccoes_query = db.query(Prospeccao).filter(Prospeccao.consultor_id == usuario.id)
        agendamentos_query = db.query(Agendamento).join(Prospeccao).filter(
            Prospeccao.consultor_id == usuario.id
        )
        empresas_query = db.query(Empresa).filter(Empresa.id.in_(empresas_ids)) if empresas_ids else None
    
    prospeccoes_por_resultado = {}
    if prospeccoes_query:
        resultados = db.query(
            Prospeccao.resultado,
            func.count(Prospeccao.id)
        ).filter(Prospeccao.resultado.isnot(None))
        
        if usuario.tipo != "admin":
            resultados = resultados.filter(Prospeccao.consultor_id == usuario.id)
        
        resultados = resultados.group_by(Prospeccao.resultado).all()
        
        for resultado, count in resultados:
            prospeccoes_por_resultado[resultado] = count
    
    from backend.utils.alertas import agregar_todos_alertas
    alertas = agregar_todos_alertas(db, usuario)
    
    empresas_por_consultor = {}
    if usuario.tipo == "admin":
        from backend.models import AtribuicaoEmpresa
        consultores_stats = db.query(
            Usuario.nome,
            func.count(AtribuicaoEmpresa.empresa_id)
        ).join(
            AtribuicaoEmpresa, Usuario.id == AtribuicaoEmpresa.consultor_id
        ).filter(
            Usuario.tipo == "consultor"
        ).group_by(Usuario.id, Usuario.nome).all()
        
        for nome, count in consultores_stats:
            empresas_por_consultor[nome] = count
    else:
        empresas_por_consultor[usuario.nome] = total_empresas
    
    empresas_por_consultor = dict(sorted(empresas_por_consultor.items(), key=lambda x: x[1], reverse=True))

    return {
        "total_empresas": total_empresas,
        "total_prospeccoes": total_prospeccoes,
        "total_agendamentos": len(alertas["vencidos"]) + len(alertas["hoje"]) + len(alertas["futuros"]),
        "prospeccoes_por_resultado": prospeccoes_por_resultado,
        "agendamentos_por_status": {
            "vencidos": len(alertas["vencidos"]),
            "hoje": len(alertas["hoje"]),
            "futuros": len(alertas["futuros"])
        },
        "empresas_por_consultor": empresas_por_consultor,
        "alertas": alertas
    }
