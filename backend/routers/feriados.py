from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from pydantic import BaseModel
from backend.database import get_db
from backend.models.feriados import Feriado
from backend.auth.security import obter_usuario_atual, Usuario

router = APIRouter(prefix="/api/feriados", tags=["Feriados"])

class FeriadoBase(BaseModel):
    data: date
    descricao: str
    fixo: bool = False

class FeriadoCreate(FeriadoBase):
    pass

class FeriadoResponse(FeriadoBase):
    id: int
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[FeriadoResponse])
def listar_feriados(
    inicio: Optional[date] = None,
    fim: Optional[date] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(Feriado)
    
    if inicio:
        query = query.filter(Feriado.data >= inicio)
    if fim:
        query = query.filter(Feriado.data <= fim)
        
    return query.order_by(Feriado.data).all()

@router.post("/", response_model=FeriadoResponse, status_code=status.HTTP_201_CREATED)
def criar_feriado(
    feriado: FeriadoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    # Check simple duplicate
    existente = db.query(Feriado).filter(Feriado.data == feriado.data).first()
    if existente:
        raise HTTPException(status_code=400, detail="Feriado já cadastrado nesta data")
        
    novo_feriado = Feriado(**feriado.model_dump())
    db.add(novo_feriado)
    db.commit()
    db.refresh(novo_feriado)
    return novo_feriado

@router.delete("/{feriado_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_feriado(
    feriado_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    feriado = db.query(Feriado).filter(Feriado.id == feriado_id).first()
    if not feriado:
        raise HTTPException(status_code=404, detail="Feriado não encontrado")
        
    db.delete(feriado)
    db.commit()
    return None
