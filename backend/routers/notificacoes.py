from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from backend.database import get_db
from backend.models import Usuario
from backend.models.notificacoes import Notificacao
from backend.schemas.notificacoes import NotificacaoCriar, NotificacaoResposta, NotificacaoAtualizar
from backend.auth.security import obter_usuario_atual

router = APIRouter(prefix="/api/notificacoes", tags=["Notificações"])

@router.post("/", response_model=NotificacaoResposta)
def criar_notificacao(
    notificacao: NotificacaoCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    if notificacao.usuario_origem_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só pode criar notificações em seu próprio nome"
        )
    
    if notificacao.usuario_destino_id and usuario.tipo != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem enviar notificações direcionadas"
        )
    
    nova_notificacao = Notificacao(**notificacao.model_dump())
    db.add(nova_notificacao)
    db.commit()
    db.refresh(nova_notificacao)
    return nova_notificacao

@router.get("/", response_model=List[NotificacaoResposta])
def listar_notificacoes(
    apenas_nao_lidas: bool = False,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(Notificacao).options(
        joinedload(Notificacao.usuario_origem)
    )
    
    query = query.filter(
        (Notificacao.usuario_destino_id == usuario.id) | 
        (Notificacao.usuario_destino_id == None)
    )
    
    if apenas_nao_lidas:
        query = query.filter(Notificacao.lida == False)
    
    notificacoes = query.order_by(Notificacao.data_criacao.desc()).all()
    return notificacoes

@router.put("/{notificacao_id}", response_model=NotificacaoResposta)
def atualizar_notificacao(
    notificacao_id: int,
    notificacao_atualizada: NotificacaoAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    notificacao = db.query(Notificacao).filter(Notificacao.id == notificacao_id).first()
    if not notificacao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notificação não encontrada"
        )
    
    if usuario.tipo != "admin" and notificacao.usuario_destino_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para atualizar esta notificação"
        )
    
    for key, value in notificacao_atualizada.model_dump(exclude_unset=True).items():
        setattr(notificacao, key, value)
    
    db.commit()
    db.refresh(notificacao)
    return notificacao

@router.put("/marcar-todas-lidas")
def marcar_todas_lidas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(Notificacao)
    
    query = query.filter(
        (Notificacao.usuario_destino_id == usuario.id) | 
        (Notificacao.usuario_destino_id == None)
    )
    
    query.filter(Notificacao.lida == False).update({Notificacao.lida: True})
    db.commit()
    
    return {"message": "Todas as notificações foram marcadas como lidas"}

@router.get("/nao-lidas/contagem")
def contar_nao_lidas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(Notificacao).filter(Notificacao.lida == False)
    
    query = query.filter(
        (Notificacao.usuario_destino_id == usuario.id) | 
        (Notificacao.usuario_destino_id == None)
    )
    
    count = query.count()
    return {"count": count}
