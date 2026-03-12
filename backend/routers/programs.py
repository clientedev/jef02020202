from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, timedelta
from pydantic import BaseModel
from backend.database import get_db
from backend.models import Empresa, Usuario
from backend.models.cronograma import Program, CronogramaEvento, CategoriaEvento, PeriodoEvento
from backend.models.feriados import Feriado
from backend.auth.security import obter_usuario_atual # Changed for general usage
from sqlalchemy import func

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
    categoria: Optional[str] = None
    numero_proposta: Optional[str] = None

class ProgramDashboard(BaseModel):
    id: int
    nome: str
    carga_horaria: float
    descricao: Optional[str]
    empresa_nome: Optional[str]
    total_agendado: float
    total_realizado: float
    atendimentos: List[dict]
    consultores: List[dict]
    data_inicio: Optional[date]
    data_fim: Optional[date]

@router.post("/", response_model=ProgramResponse)
def create_program(program: ProgramCreate, db: Session = Depends(get_db)):
    db_program = Program(**program.dict())
    db.add(db_program)
    db.commit()
    db.refresh(db_program)
    return db_program

@router.get("/", response_model=List[ProgramResponse])
def list_programs(empresa_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Program)
    if empresa_id is not None:
        # Return programs linked to this empresa OR global programs (no empresa_id)
        query = query.filter((Program.empresa_id == empresa_id) | (Program.empresa_id == None))
    return query.order_by(Program.nome).all()

@router.put("/{program_id}", response_model=ProgramResponse)
def update_program(program_id: int, program_data: ProgramCreate, db: Session = Depends(get_db)):
    db_program = db.query(Program).filter(Program.id == program_id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Programa não encontrado")
    
    for key, value in program_data.dict().items():
        setattr(db_program, key, value)
    
    db.commit()
    db.refresh(db_program)
    return db_program

@router.delete("/{program_id}")
def delete_program(program_id: int, db: Session = Depends(get_db)):
    db_program = db.query(Program).filter(Program.id == program_id).first()
    if not db_program:
        raise HTTPException(status_code=404, detail="Programa não encontrado")
    
    db.delete(db_program)
    db.commit()
    return {"message": "Programa excluído com sucesso"}

@router.post("/auto-schedule")
def auto_schedule(request: AutoScheduleRequest, db: Session = Depends(get_db)):
    program = db.query(Program).filter(Program.id == request.program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Programa não encontrado")

    horas_restantes = float(program.carga_horaria)
    data_atual = request.data_inicio
    eventos_criados = []

    empresa_id_final = request.empresa_id if request.empresa_id else program.empresa_id
    
    
    # Pre-fetch holidays
    feriados = db.query(Feriado).filter(
        Feriado.data >= data_atual,
        Feriado.data <= data_atual + timedelta(days=365)
    ).all()
    feriados_datas = {f.data for f in feriados}

    # Use a small epsilon for float comparison
    while horas_restantes > 0.01:
        # Check if it's a holiday
        if data_atual in feriados_datas:
             data_atual += timedelta(days=1)
             if (data_atual - request.data_inicio).days > 365: # Safety break
                break
             continue

        if data_atual.weekday() in request.dias_semana:
            # Calculate hours for today (cap at remaining)
            horas_hoje = min(request.horas_por_dia, horas_restantes)
            
            # Avoid creating very tiny sessions (e.g., 0.0001h)
            if horas_hoje < 0.1:
                break

            # If this is the remainder (not a full block) and we already created events,
            # place it on the same day as the last event instead of spanning a new day.
            data_evento = data_atual
            if horas_hoje < request.horas_por_dia and len(eventos_criados) > 0:
                data_evento = eventos_criados[-1].data

            novo_evento = CronogramaEvento(
                data=data_evento,
                categoria=request.categoria if request.categoria else CategoriaEvento.programado,
                periodo=PeriodoEvento.dia_todo if horas_hoje >= 4 else PeriodoEvento.manha,
                consultor_id=request.consultor_id,
                empresa_id=empresa_id_final,
                projeto_id=request.projeto_id,
                program_id=program.id,
                titulo=f"{program.nome} - Sessão",
                descricao=f"Sessão automática da solução {program.nome}. Carga: {horas_hoje}h (Restante)",
                carga_horaria=round(horas_hoje, 2),
                numero_proposta=request.numero_proposta
            )
            db.add(novo_evento)
            eventos_criados.append(novo_evento)
            horas_restantes -= horas_hoje
        
        data_atual += timedelta(days=1)
        if (data_atual - request.data_inicio).days > 365: # Safety break
            break

    db.commit()
    return {"message": f"{len(eventos_criados)} eventos criados com sucesso", "total_horas": program.carga_horaria}

@router.get("/{program_id}/dashboard", response_model=ProgramDashboard)
def get_program_dashboard(
    program_id: int, 
    consultor_id: Optional[int] = None,
    empresa_id: Optional[int] = None,
    numero_proposta: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    program = db.query(Program).filter(Program.id == program_id).first()
    if not program:
        raise HTTPException(status_code=404, detail="Programa não encontrado")
    
    # Calc totals
    hoje = date.today()
    
    def apply_filters(query):
        if consultor_id:
            query = query.filter(CronogramaEvento.consultor_id == consultor_id)
        if empresa_id:
            query = query.filter(CronogramaEvento.empresa_id == empresa_id)
        if numero_proposta:
            query = query.filter(CronogramaEvento.numero_proposta == numero_proposta)
        return query

    realizado_query = db.query(func.sum(CronogramaEvento.carga_horaria))\
        .filter(CronogramaEvento.program_id == program_id)\
        .filter(CronogramaEvento.data <= hoje)
    realizado = apply_filters(realizado_query).scalar() or 0
        
    agendado_query = db.query(func.sum(CronogramaEvento.carga_horaria))\
        .filter(CronogramaEvento.program_id == program_id)
    agendado = apply_filters(agendado_query).scalar() or 0
        
    # Get all events (simplified info)
    eventos_query = db.query(CronogramaEvento).filter(CronogramaEvento.program_id == program_id).order_by(CronogramaEvento.data.desc())
    eventos_db = apply_filters(eventos_query).all()
    
    atendimentos = []
    for e in eventos_db:
        atendimentos.append({
            "id": e.id,
            "data": e.data.isoformat(),
            "consultor": e.consultor.nome if e.consultor else "N/A",
            "carga_horaria": e.carga_horaria,
            "categoria": e.categoria,
            "descricao": e.descricao
        })
        
    # Stats by consultant
    consultores_stats_query = db.query(
        Usuario.nome,
        func.sum(CronogramaEvento.carga_horaria).label("horas"),
        func.count(CronogramaEvento.id).label("sessoes")
    ).join(CronogramaEvento, Usuario.id == CronogramaEvento.consultor_id)\
     .filter(CronogramaEvento.program_id == program_id)
    
    consultores_stats = apply_filters(consultores_stats_query).group_by(Usuario.nome).all()
     
    consultores = [{"nome": c[0], "horas": c[1], "sessoes": c[2]} for c in consultores_stats]
    
    # First and last session
    data_inicio_query = db.query(func.min(CronogramaEvento.data)).filter(CronogramaEvento.program_id == program_id)
    data_inicio = apply_filters(data_inicio_query).scalar()
    
    data_fim_query = db.query(func.max(CronogramaEvento.data)).filter(CronogramaEvento.program_id == program_id)
    data_fim = apply_filters(data_fim_query).scalar()

    return {
        "id": program.id,
        "nome": program.nome,
        "carga_horaria": program.carga_horaria,
        "descricao": program.descricao,
        "empresa_nome": program.empresa.empresa if program.empresa else "Global",
        "total_agendado": agendado,
        "total_realizado": realizado,
        "atendimentos": atendimentos,
        "consultores": consultores,
        "data_inicio": data_inicio,
        "data_fim": data_fim
    }
