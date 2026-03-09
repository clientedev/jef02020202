from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from backend.database import get_db
from backend.models import Usuario, CronogramaEvento, Empresa, Program
from backend.auth.security import obter_usuario_atual
from backend.models.usuarios import TipoUsuario

router = APIRouter(prefix="/api/producao-diaria", tags=["Produção Diaria"])

@router.get("/")
def listar_producao_diaria(
    data: date = Query(default=date.today()),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    # Get all consultants
    consultores = db.query(Usuario).filter(Usuario.tipo == TipoUsuario.consultor).all()
    
    resultado = []
    for c in consultores:
        # Find if there's an event for this consultant on this day
        evento = db.query(CronogramaEvento).filter(
            CronogramaEvento.consultor_id == c.id,
            CronogramaEvento.data == data
        ).first()
        
        item = {
            "consultor_id": c.id,
            "consultor_nome": c.nome,
            "tem_evento": False,
            "evento_id": None,
            "local": "Disponível",
            "empresa": None,
            "programa": None,
            "lancado_sgset": False
        }
        
        if evento:
            item["tem_evento"] = True
            item["evento_id"] = evento.id
            item["empresa"] = evento.empresa.empresa if evento.empresa else (evento.sigla_empresa or "N/A")
            item["programa"] = evento.program.nome if evento.program else "Consultoria"
            item["local"] = f"{item['empresa']} - {item['programa']}"
            item["lancado_sgset"] = bool(evento.lancado_sgset)
            
        resultado.append(item)
        
    return resultado

@router.put("/toggle-sgset/{evento_id}")
def toggle_sgset(
    evento_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    evento = db.query(CronogramaEvento).filter(CronogramaEvento.id == evento_id).first()
    if not evento:
        raise HTTPException(status_code=404, detail="Evento não encontrado")
        
    evento.lancado_sgset = 0 if evento.lancado_sgset else 1
    db.commit()
    return {"message": "Status SGSET atualizado", "lancado_sgset": bool(evento.lancado_sgset)}
