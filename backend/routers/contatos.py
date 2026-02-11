from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models import Contato, Usuario
from backend.schemas.crm import ContatoCriar, ContatoResposta
from backend.auth.security import obter_usuario_atual, obter_usuario_admin

router = APIRouter(prefix="/api/contatos", tags=["Contatos"])

@router.post("/", response_model=ContatoResposta)
def criar_contato(
    contato: ContatoCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    novo_contato = Contato(**contato.model_dump())
    db.add(novo_contato)
    db.commit()
    db.refresh(novo_contato)
    return novo_contato

@router.get("/empresa/{empresa_id}", response_model=List[ContatoResposta])
def listar_contatos_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    return db.query(Contato).filter(Contato.empresa_id == empresa_id).all()

@router.delete("/{contato_id}")
def deletar_contato(
    contato_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    contato = db.query(Contato).filter(Contato.id == contato_id).first()
    if not contato:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    
    db.delete(contato)
    db.commit()
    return {"message": "Contato removido com sucesso"}
