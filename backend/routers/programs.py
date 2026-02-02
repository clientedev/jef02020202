from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from pydantic import BaseModel
from backend.database import get_db
from backend.models.cronograma import Program, CronogramaEvento, CategoriaEvento, PeriodoEvento
from backend.auth.security import obter_usuario_admin as get_current_user

router = APIRouter(prefix="/api/programs", tags=["programs"])

class ProgramCreate(BaseModel):
    nome: str
    carga_horaria: float
    descricao: Optional[str] = None
    empresa_id: Optional[int] = None

class ProgramResponse(ProgramCreate):
    id: int
    class Config:
        from_attributes = True

class AutoScheduleRequest(BaseModel):
    program_id: int
    consultor_id: int
    empresa_id: Optional[int] = None
    projeto_id: Optional[int] = None
    data_inicio: date
    dias_semana: List[int]  # 0=Monday, 6=Sunday
    horas_por_dia: float

@router.post("/", response_model=ProgramResponse)
def create_program(program: ProgramCreate, db: Session = Depends(get_db)):
    db_program = Program(**program.dict())
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return db_program

@router.get("/", response_model=List[ProgramResponse])
def list_programs(db: Session = Depends(get_db)):
    return db.query(Program).all()

@router.post("/auto-schedule")
def auto_schedule(request: AutoScheduleRequest, db: Session = Depends(get_db)):
    program = db.query(Program).filter(Program.id == request.program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Programa não encontrado")

    horas_restantes = float(program.carga_horaria)
    data_atual = request.data_inicio
    eventos_criados = []

    empresa_id_final = request.empresa_id if request.empresa_id else program.empresa_id
    
    while horas_restantes > 0:
        if data_atual.weekday() in request.dias_semana:
            horas_hoje = min(request.horas_por_dia, horas_restantes)
            
            novo_evento = CronogramaEvento(
                data=data_atual,
                categoria=CategoriaEvento.programado,
                periodo=PeriodoEvento.dia_todo if horas_hoje >= 4 else PeriodoEvento.manha,
                consultor_id=request.consultor_id,
                empresa_id=empresa_id_final,
                projeto_id=request.projeto_id,
                program_id=program.id,
                titulo=f"{program.nome} - Sessão",
                descricao=f"Sessão automática do programa {program.nome}. Carga: {horas_hoje}h"
            )
            db.add(novo_evento)
            eventos_criados.append(novo_evento)
            horas_restantes -= float(horas_hoje)
        
        data_atual += timedelta(days=1)
        if (data_atual - request.data_inicio).days > 365: # Safety break
            break

    db.commit()
    return {"message": f"{len(eventos_criados)} eventos criados com sucesso", "total_horas": program.carga_horaria}
