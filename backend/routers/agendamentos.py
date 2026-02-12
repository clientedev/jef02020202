from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
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
    from backend.utils.alertas import agregar_todos_alertas
    return agregar_todos_alertas(db, usuario)

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
@router.post("/{agendamento_id}/reagendar", response_model=AgendamentoResposta)
def reagendar_agendamento(
    agendamento_id: int,
    nova_data: datetime,
    observacoes: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    agendamento_antigo = db.query(Agendamento).filter(Agendamento.id == agendamento_id).first()
    if not agendamento_antigo:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado")
    
    # Create new agendamento
    novo_agendamento = Agendamento(
        prospeccao_id=agendamento_antigo.prospeccao_id,
        data_agendada=nova_data,
        status=StatusAgendamento.pendente,
        observacoes=observacoes or agendamento_antigo.observacoes,
        reagendado_de_id=agendamento_antigo.id
    )
    db.add(novo_agendamento)
    db.flush() # Get ID
    
    # Update old agendamento
    agendamento_antigo.status = StatusAgendamento.reagendado
    agendamento_antigo.reagendado_para_id = novo_agendamento.id
    
    # Log to history
    from backend.models.historico import HistoricoEmpresa
    from backend.models.prospeccoes import Prospeccao
    
    prospeccao = db.query(Prospeccao).filter(Prospeccao.id == agendamento_antigo.prospeccao_id).first()
    if prospeccao:
        historico = HistoricoEmpresa(
            empresa_id=prospeccao.empresa_id,
            usuario_id=usuario.id,
            tipo_acao="Reagendamento",
            detalhes=f"Reagendado de {agendamento_antigo.data_agendada} para {nova_data}. Motivo: {observacoes or 'Não informado'}"
        )
        db.add(historico)
    
    db.commit()
    db.refresh(novo_agendamento)
    return novo_agendamento
