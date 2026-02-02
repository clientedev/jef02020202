from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List
from datetime import datetime, date
from backend.database import get_db
from backend.models import Agendamento, Prospeccao, Usuario, StatusAgendamento
from backend.schemas.agendamentos import AgendamentoCriar, AgendamentoResposta, AgendamentoAtualizar
from backend.auth.security import obter_usuario_atual

router = APIRouter(prefix="/api/agendamentos", tags=["Agendamentos"])

@router.post("/", response_model=AgendamentoResposta)
def criar_agendamento(
    agendamento: AgendamentoCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    prospeccao = db.query(Prospeccao).filter(Prospeccao.id == agendamento.prospeccao_id).first()
    if not prospeccao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospecção não encontrada"
        )
    
    if usuario.tipo != "admin" and prospeccao.consultor_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para criar agendamento nesta prospecção"
        )
    
    novo_agendamento = Agendamento(**agendamento.model_dump())
    db.add(novo_agendamento)
    db.commit()
    db.refresh(novo_agendamento)
    return novo_agendamento

@router.get("/", response_model=List[AgendamentoResposta])
def listar_agendamentos(
    skip: int = 0,
    limit: int = 100,
    empresa_id: int = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(Agendamento).join(Prospeccao)
    
    if usuario.tipo != "admin":
        query = query.filter(Prospeccao.consultor_id == usuario.id)
    
    if empresa_id:
        query = query.filter(Prospeccao.empresa_id == empresa_id)
    
    agendamentos = query.offset(skip).limit(limit).all()
    return agendamentos

@router.get("/alertas")
def obter_alertas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    hoje = datetime.now().date()
    hoje_inicio = datetime.combine(hoje, datetime.min.time())
    hoje_fim = datetime.combine(hoje, datetime.max.time())
    
    query = db.query(Agendamento).join(Prospeccao)
    
    if usuario.tipo != "admin":
        query = query.filter(Prospeccao.consultor_id == usuario.id)
    
    query = query.filter(Agendamento.status == StatusAgendamento.pendente)
    
    vencidos = query.filter(Agendamento.data_agendada < hoje_inicio).all()
    hoje_agendamentos = query.filter(
        and_(
            Agendamento.data_agendada >= hoje_inicio,
            Agendamento.data_agendada <= hoje_fim
        )
    ).all()
    futuros = query.filter(Agendamento.data_agendada > hoje_fim).all()
    
    return {
        "vencidos": [{"id": a.id, "prospeccao_id": a.prospeccao_id, "data_agendada": a.data_agendada, "observacoes": a.observacoes} for a in vencidos],
        "hoje": [{"id": a.id, "prospeccao_id": a.prospeccao_id, "data_agendada": a.data_agendada, "observacoes": a.observacoes} for a in hoje_agendamentos],
        "futuros": [{"id": a.id, "prospeccao_id": a.prospeccao_id, "data_agendada": a.data_agendada, "observacoes": a.observacoes} for a in futuros]
    }

@router.put("/{agendamento_id}", response_model=AgendamentoResposta)
def atualizar_agendamento(
    agendamento_id: int,
    agendamento_atualizado: AgendamentoAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    agendamento = db.query(Agendamento).join(Prospeccao).filter(Agendamento.id == agendamento_id).first()
    if not agendamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agendamento não encontrado"
        )
    
    if usuario.tipo != "admin" and agendamento.prospeccao.consultor_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para atualizar este agendamento"
        )
    
    for key, value in agendamento_atualizado.model_dump(exclude_unset=True).items():
        setattr(agendamento, key, value)
    
    db.commit()
    db.refresh(agendamento)
    return agendamento
