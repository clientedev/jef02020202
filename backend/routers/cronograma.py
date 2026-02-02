from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import date, datetime
from backend.database import get_db
from backend.models import CronogramaProjeto, CronogramaAtividade, CronogramaEvento, Usuario, Empresa, CategoriaEvento, PeriodoEvento
from backend.schemas.cronograma import (
    CronogramaProjetoCriar, CronogramaProjetoResposta, CronogramaProjetoAtualizar,
    CronogramaAtividadeCriar, CronogramaAtividadeResposta, CronogramaAtividadeAtualizar,
    CronogramaEventoCriar, CronogramaEventoResposta, CronogramaEventoAtualizar,
    EventoCalendario, TimelineItem
)
from backend.auth.security import obter_usuario_atual

CATEGORIA_CORES = {
    "C": {"nome": "Consultoria", "cor": "#22c55e"},
    "K": {"nome": "Kick-off", "cor": "#eab308"},
    "F": {"nome": "Reuniao Final", "cor": "#3b82f6"},
    "M": {"nome": "Mentoria", "cor": "#ef4444"},
    "T": {"nome": "T0 - Diagnostico", "cor": "#f97316"},
    "P": {"nome": "Programado", "cor": "#06b6d4"},
    "O": {"nome": "Outros", "cor": "#6b7280"},
}

router = APIRouter(prefix="/api/cronograma", tags=["Cronograma"])


@router.get("/projetos", response_model=List[CronogramaProjetoResposta])
def listar_projetos(
    consultor_id: Optional[int] = None,
    empresa_id: Optional[int] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(CronogramaProjeto)
    
    if consultor_id:
        query = query.filter(CronogramaProjeto.consultor_id == consultor_id)
    
    if empresa_id:
        query = query.filter(CronogramaProjeto.empresa_id == empresa_id)
    
    if data_inicio:
        query = query.filter(CronogramaProjeto.data_inicio >= data_inicio)
    
    if data_fim:
        query = query.filter(CronogramaProjeto.data_termino <= data_fim)
    
    if status:
        query = query.filter(CronogramaProjeto.status == status)
    
    total = query.count()
    skip = (page - 1) * page_size
    projetos = query.order_by(CronogramaProjeto.data_inicio.desc()).offset(skip).limit(page_size).all()
    
    return projetos


@router.get("/projetos/{projeto_id}", response_model=CronogramaProjetoResposta)
def obter_projeto(
    projeto_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    projeto = db.query(CronogramaProjeto).filter(CronogramaProjeto.id == projeto_id).first()
    
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )
    
    return projeto


@router.post("/projetos", response_model=CronogramaProjetoResposta, status_code=status.HTTP_201_CREATED)
def criar_projeto(
    projeto: CronogramaProjetoCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    novo_projeto = CronogramaProjeto(**projeto.model_dump())
    
    db.add(novo_projeto)
    db.commit()
    db.refresh(novo_projeto)
    
    return novo_projeto


@router.put("/projetos/{projeto_id}", response_model=CronogramaProjetoResposta)
def atualizar_projeto(
    projeto_id: int,
    dados: CronogramaProjetoAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    projeto = db.query(CronogramaProjeto).filter(CronogramaProjeto.id == projeto_id).first()
    
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )
    
    dados_atualizacao = dados.model_dump(exclude_unset=True)
    for campo, valor in dados_atualizacao.items():
        setattr(projeto, campo, valor)
    
    projeto.data_atualizacao = datetime.utcnow()
    db.commit()
    db.refresh(projeto)
    
    return projeto


@router.delete("/projetos/{projeto_id}")
def deletar_projeto(
    projeto_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    projeto = db.query(CronogramaProjeto).filter(CronogramaProjeto.id == projeto_id).first()
    
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )
    
    db.delete(projeto)
    db.commit()
    
    return {"message": "Projeto deletado com sucesso"}


@router.get("/atividades", response_model=List[CronogramaAtividadeResposta])
def listar_atividades(
    projeto_id: Optional[int] = None,
    responsavel_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(CronogramaAtividade)
    
    if projeto_id:
        query = query.filter(CronogramaAtividade.projeto_id == projeto_id)
    
    if responsavel_id:
        query = query.filter(CronogramaAtividade.responsavel_id == responsavel_id)
    
    if status:
        query = query.filter(CronogramaAtividade.status == status)
    
    atividades = query.order_by(CronogramaAtividade.data_inicio).all()
    
    return atividades


@router.post("/atividades", response_model=CronogramaAtividadeResposta, status_code=status.HTTP_201_CREATED)
def criar_atividade(
    atividade: CronogramaAtividadeCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    projeto = db.query(CronogramaProjeto).filter(CronogramaProjeto.id == atividade.projeto_id).first()
    if not projeto:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Projeto não encontrado"
        )
    
    nova_atividade = CronogramaAtividade(**atividade.model_dump())
    
    db.add(nova_atividade)
    db.commit()
    db.refresh(nova_atividade)
    
    return nova_atividade


@router.put("/atividades/{atividade_id}", response_model=CronogramaAtividadeResposta)
def atualizar_atividade(
    atividade_id: int,
    dados: CronogramaAtividadeAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    atividade = db.query(CronogramaAtividade).filter(CronogramaAtividade.id == atividade_id).first()
    
    if not atividade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Atividade não encontrada"
        )
    
    dados_atualizacao = dados.model_dump(exclude_unset=True)
    for campo, valor in dados_atualizacao.items():
        setattr(atividade, campo, valor)
    
    atividade.data_atualizacao = datetime.utcnow()
    db.commit()
    db.refresh(atividade)
    
    return atividade


@router.delete("/atividades/{atividade_id}")
def deletar_atividade(
    atividade_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    atividade = db.query(CronogramaAtividade).filter(CronogramaAtividade.id == atividade_id).first()
    
    if not atividade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Atividade não encontrada"
        )
    
    db.delete(atividade)
    db.commit()
    
    return {"message": "Atividade deletada com sucesso"}


@router.get("/timeline", response_model=List[TimelineItem])
def obter_timeline(
    consultor_id: Optional[int] = None,
    empresa_id: Optional[int] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(CronogramaProjeto).options(
        joinedload(CronogramaProjeto.empresa),
        joinedload(CronogramaProjeto.consultor)
    )
    
    if consultor_id:
        query = query.filter(CronogramaProjeto.consultor_id == consultor_id)
    
    if empresa_id:
        query = query.filter(CronogramaProjeto.empresa_id == empresa_id)
    
    if data_inicio:
        query = query.filter(CronogramaProjeto.data_termino >= data_inicio)
    
    if data_fim:
        query = query.filter(CronogramaProjeto.data_inicio <= data_fim)
    
    projetos = query.order_by(CronogramaProjeto.data_inicio).all()
    
    timeline = []
    for projeto in projetos:
        empresa_nome = projeto.empresa.empresa if projeto.empresa else projeto.sigla
        consultor_nome = projeto.consultor.nome if projeto.consultor else projeto.consultor_nome
        
        if projeto.data_inicio and projeto.data_termino:
            dias_totais = (projeto.data_termino - projeto.data_inicio).days
            dias_passados = (date.today() - projeto.data_inicio).days
            progresso = min(100, max(0, (dias_passados / dias_totais * 100) if dias_totais > 0 else 0))
            
            timeline.append(TimelineItem(
                id=projeto.id,
                titulo=f"{projeto.proposta or 'Sem proposta'} - {empresa_nome or 'Sem empresa'}",
                tipo="projeto",
                data_inicio=projeto.data_inicio,
                data_fim=projeto.data_termino,
                consultor_nome=consultor_nome,
                empresa_nome=empresa_nome,
                status=projeto.status.value,
                progresso=round(progresso, 1)
            ))
    
    return timeline


@router.get("/eventos", response_model=List[EventoCalendario])
def listar_eventos(
    consultor_id: Optional[int] = None,
    data_inicio: Optional[date] = None,
    data_fim: Optional[date] = None,
    categoria: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(CronogramaEvento).options(
        joinedload(CronogramaEvento.consultor)
    )
    
    if consultor_id:
        query = query.filter(CronogramaEvento.consultor_id == consultor_id)
    
    if data_inicio:
        query = query.filter(CronogramaEvento.data >= data_inicio)
    
    if data_fim:
        query = query.filter(CronogramaEvento.data <= data_fim)
    
    if categoria:
        try:
            cat_enum = CategoriaEvento(categoria)
            query = query.filter(CronogramaEvento.categoria == cat_enum)
        except ValueError:
            pass
    
    eventos = query.order_by(CronogramaEvento.data, CronogramaEvento.consultor_id).all()
    
    result = []
    for evento in eventos:
        cat_value = evento.categoria.value
        cat_info = CATEGORIA_CORES.get(cat_value, {"nome": "Outros", "cor": "#6b7280"})
        
        result.append(EventoCalendario(
            id=evento.id,
            data=evento.data,
            categoria=cat_value,
            categoria_nome=cat_info["nome"],
            periodo=evento.periodo.value if evento.periodo else "D",
            sigla_empresa=evento.sigla_empresa,
            consultor_id=evento.consultor_id,
            consultor_nome=evento.consultor.nome if evento.consultor else "Sem consultor",
            titulo=evento.titulo or f"{cat_value}-{evento.sigla_empresa or ''}",
            cor=cat_info["cor"]
        ))
    
    return result


@router.get("/eventos/{evento_id}", response_model=CronogramaEventoResposta)
def obter_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    evento = db.query(CronogramaEvento).options(
        joinedload(CronogramaEvento.consultor)
    ).filter(CronogramaEvento.id == evento_id).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento nao encontrado"
        )
    
    return evento


@router.post("/eventos", response_model=CronogramaEventoResposta, status_code=status.HTTP_201_CREATED)
def criar_evento(
    evento: CronogramaEventoCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    consultor = db.query(Usuario).filter(Usuario.id == evento.consultor_id).first()
    if not consultor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consultor nao encontrado"
        )
    
    novo_evento = CronogramaEvento(**evento.model_dump())
    
    db.add(novo_evento)
    db.commit()
    db.refresh(novo_evento)
    
    return novo_evento


@router.put("/eventos/{evento_id}", response_model=CronogramaEventoResposta)
def atualizar_evento(
    evento_id: int,
    dados: CronogramaEventoAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    evento = db.query(CronogramaEvento).filter(CronogramaEvento.id == evento_id).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento nao encontrado"
        )
    
    if dados.consultor_id:
        consultor = db.query(Usuario).filter(Usuario.id == dados.consultor_id).first()
        if not consultor:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Consultor nao encontrado"
            )
    
    dados_atualizacao = dados.model_dump(exclude_unset=True)
    for campo, valor in dados_atualizacao.items():
        setattr(evento, campo, valor)
    
    evento.data_atualizacao = datetime.utcnow()
    db.commit()
    db.refresh(evento)
    
    return evento


@router.delete("/eventos/{evento_id}")
def deletar_evento(
    evento_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    evento = db.query(CronogramaEvento).filter(CronogramaEvento.id == evento_id).first()
    
    if not evento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evento nao encontrado"
        )
    
    db.delete(evento)
    db.commit()
    
    return {"message": "Evento deletado com sucesso"}


@router.get("/categorias")
def listar_categorias(
    usuario: Usuario = Depends(obter_usuario_atual)
):
    return [
        {"codigo": k, "nome": v["nome"], "cor": v["cor"]}
        for k, v in CATEGORIA_CORES.items()
    ]
