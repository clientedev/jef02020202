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
    data_fim: Optional[date] = None

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

@router.post("/", response_model=List[FeriadoResponse], status_code=status.HTTP_201_CREATED)
def criar_feriado(
    feriado: FeriadoCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    from datetime import timedelta
    
    datas = []
    if feriado.data_fim and feriado.data_fim > feriado.data:
        # Range of dates
        delta = (feriado.data_fim - feriado.data).days
        for i in range(delta + 1):
            datas.append(feriado.data + timedelta(days=i))
    else:
        # Single date
        datas.append(feriado.data)
    
    criados = []
    for d in datas:
        # Check simple duplicate
        existente = db.query(Feriado).filter(Feriado.data == d).first()
        if not existente:
            novo_feriado = Feriado(
                data=d,
                descricao=feriado.descricao,
                fixo=feriado.fixo
            )
            db.add(novo_feriado)
            criados.append(novo_feriado)
            
    db.commit()
    for c in criados:
        db.refresh(c)
        
    return criados

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
