from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta
import os
import shutil
import json

from backend.database import get_db
from backend.models import (
    Stage, CompanyPipeline, CompanyStageHistory, Note, Attachment, Activity,
    Usuario, Empresa
)
from backend.schemas.pipeline import (
    StageCriar, StageAtualizar, StageResposta,
    CompanyPipelineCriar, CompanyPipelineAtualizar, CompanyPipelineResposta,
    MoverStageRequest, CompanyStageHistoryResposta,
    NoteCriar, NoteAtualizar, NoteResposta,
    AttachmentResposta, ActivityResposta, PipelineStats
)
from backend.auth.security import obter_usuario_atual, obter_usuario_admin

router = APIRouter(prefix="/api/pipeline", tags=["Pipeline Kanban"])

# ===================== STAGES =====================

@router.post("/stages", response_model=StageResposta)
def criar_stage(
    stage: StageCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_admin)
):
    """Criar novo estágio do pipeline"""
    novo_stage = Stage(**stage.model_dump())
    db.add(novo_stage)
    db.commit()
    db.refresh(novo_stage)
    
    # Registrar atividade
    registrar_atividade(
        db, usuario.id, None, "criacao",
        f"Criou estágio '{novo_stage.nome}' no pipeline"
    )
    
    return novo_stage

@router.get("/stages", response_model=List[StageResposta])
def listar_stages(
    apenas_ativos: bool = True,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Listar todos os estágios"""
    query = db.query(Stage).order_by(Stage.ordem)
    if apenas_ativos:
        query = query.filter(Stage.ativo == True)
    return query.all()

@router.put("/stages/{stage_id}", response_model=StageResposta)
def atualizar_stage(
    stage_id: int,
    stage_data: StageAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_admin)
):
    """Atualizar estágio"""
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Estágio não encontrado")
    
    for key, value in stage_data.model_dump(exclude_unset=True).items():
        setattr(stage, key, value)
    
    db.commit()
    db.refresh(stage)
    return stage

@router.delete("/stages/{stage_id}")
def deletar_stage(
    stage_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_admin)
):
    """Desativar estágio (soft delete)"""
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Estágio não encontrado")
    
    # Verificar se há empresas neste estágio
    empresas_count = db.query(CompanyPipeline).filter(
        CompanyPipeline.stage_id == stage_id,
        CompanyPipeline.ativo == True
    ).count()
    
    if empresas_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível deletar. Existem {empresas_count} empresas neste estágio."
        )
    
    stage.ativo = False
    db.commit()
    return {"message": "Estágio desativado com sucesso"}

# ===================== COMPANY PIPELINE =====================

@router.post("/companies", response_model=CompanyPipelineResposta)
def adicionar_empresa_pipeline(
    company: CompanyPipelineCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Adicionar empresa ao pipeline"""
    # Verificar se empresa existe
    empresa = db.query(Empresa).filter(Empresa.id == company.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    # Verificar se estágio existe
    stage = db.query(Stage).filter(Stage.id == company.stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Estágio não encontrado")
    
    # Verificar se empresa já está no pipeline
    existe = db.query(CompanyPipeline).filter(
        CompanyPipeline.empresa_id == company.empresa_id,
        CompanyPipeline.ativo == True
    ).first()
    
    if existe:
        raise HTTPException(
            status_code=400,
            detail="Empresa já está no pipeline"
        )
    
    # SEGURANÇA: Forçar consultor_id para não-admin
    data_dict = company.model_dump()
    if usuario.tipo != "admin":
        data_dict['consultor_id'] = usuario.id
    
    # Criar entrada no pipeline
    nova_entrada = CompanyPipeline(**data_dict)
    db.add(nova_entrada)
    db.commit()
    db.refresh(nova_entrada)
    
    # Registrar histórico
    historico = CompanyStageHistory(
        company_pipeline_id=nova_entrada.id,
        stage_novo_id=company.stage_id,
        usuario_id=usuario.id,
        observacoes="Empresa adicionada ao pipeline"
    )
    db.add(historico)
    
    # Registrar atividade
    registrar_atividade(
        db, usuario.id, company.empresa_id, "criacao",
        f"Adicionou empresa ao pipeline no estágio '{stage.nome}'"
    )
    
    db.commit()
    
    # Carregar com relacionamentos
    return db.query(CompanyPipeline).options(
        joinedload(CompanyPipeline.empresa),
        joinedload(CompanyPipeline.stage),
        joinedload(CompanyPipeline.consultor)
    ).filter(CompanyPipeline.id == nova_entrada.id).first()

@router.get("/companies", response_model=List[CompanyPipelineResposta])
def listar_empresas_pipeline(
    stage_id: Optional[int] = None,
    linha: Optional[str] = None,
    consultor_id: Optional[int] = None,
    apenas_ativas: bool = True,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Listar empresas no pipeline"""
    query = db.query(CompanyPipeline).options(
        joinedload(CompanyPipeline.empresa),
        joinedload(CompanyPipeline.stage),
        joinedload(CompanyPipeline.consultor)
    )
    
    if apenas_ativas:
        query = query.filter(CompanyPipeline.ativo == True)
    
    if stage_id:
        query = query.filter(CompanyPipeline.stage_id == stage_id)
    
    if linha:
        query = query.filter(CompanyPipeline.linha == linha)
    
    # SEGURANÇA: Consultores não-admin só podem ver suas próprias empresas
    if usuario.tipo != "admin":
        # Ignorar consultor_id passado e forçar o do usuário atual
        query = query.filter(CompanyPipeline.consultor_id == usuario.id)
    elif consultor_id:
        # Admin pode filtrar por consultor_id se quiser
        query = query.filter(CompanyPipeline.consultor_id == consultor_id)
    
    return query.all()

@router.get("/companies/{company_pipeline_id}", response_model=CompanyPipelineResposta)
def obter_empresa_pipeline(
    company_pipeline_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Obter detalhes de uma empresa no pipeline"""
    company = db.query(CompanyPipeline).options(
        joinedload(CompanyPipeline.empresa),
        joinedload(CompanyPipeline.stage),
        joinedload(CompanyPipeline.consultor)
    ).filter(CompanyPipeline.id == company_pipeline_id).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada no pipeline")
    
    # Verificar permissão
    if usuario.tipo != "admin" and company.consultor_id != usuario.id:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    return company

@router.put("/companies/{company_pipeline_id}", response_model=CompanyPipelineResposta)
def atualizar_empresa_pipeline(
    company_pipeline_id: int,
    company_data: CompanyPipelineAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Atualizar empresa no pipeline"""
    # Verificar permissão primeiro
    company = verificar_permissao_company_pipeline(company_pipeline_id, usuario, db)
    
    # SEGURANÇA: Não permitir que consultores alterem o consultor_id
    data_dict = company_data.model_dump(exclude_unset=True)
    if usuario.tipo != "admin" and 'consultor_id' in data_dict:
        del data_dict['consultor_id']
    
    for key, value in data_dict.items():
        setattr(company, key, value)
    
    db.commit()
    db.refresh(company)
    
    return db.query(CompanyPipeline).options(
        joinedload(CompanyPipeline.empresa),
        joinedload(CompanyPipeline.stage),
        joinedload(CompanyPipeline.consultor)
    ).filter(CompanyPipeline.id == company_pipeline_id).first()

@router.post("/companies/{company_pipeline_id}/mover", response_model=CompanyPipelineResposta)
def mover_empresa_stage(
    company_pipeline_id: int,
    movimento: MoverStageRequest,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Mover empresa para outro estágio"""
    # Verificar permissão primeiro
    company = verificar_permissao_company_pipeline(company_pipeline_id, usuario, db)
    
    # Verificar se novo estágio existe
    novo_stage = db.query(Stage).filter(Stage.id == movimento.novo_stage_id).first()
    if not novo_stage:
        raise HTTPException(status_code=404, detail="Estágio não encontrado")
    
    stage_anterior_id = company.stage_id
    
    # Atualizar estágio
    company.stage_id = movimento.novo_stage_id
    company.data_entrada_stage = datetime.utcnow()
    
    # Registrar histórico
    historico = CompanyStageHistory(
        company_pipeline_id=company_pipeline_id,
        stage_anterior_id=stage_anterior_id,
        stage_novo_id=movimento.novo_stage_id,
        usuario_id=usuario.id,
        observacoes=movimento.observacoes
    )
    db.add(historico)
    
    # Registrar atividade
    stage_anterior = db.query(Stage).filter(Stage.id == stage_anterior_id).first()
    registrar_atividade(
        db, usuario.id, company.empresa_id, "movimentacao",
        f"Moveu empresa de '{stage_anterior.nome}' para '{novo_stage.nome}'",
        {"stage_anterior_id": stage_anterior_id, "stage_novo_id": movimento.novo_stage_id}
    )
    
    db.commit()
    
    return db.query(CompanyPipeline).options(
        joinedload(CompanyPipeline.empresa),
        joinedload(CompanyPipeline.stage),
        joinedload(CompanyPipeline.consultor)
    ).filter(CompanyPipeline.id == company_pipeline_id).first()

# ===================== HISTÓRICO =====================

@router.get("/companies/{company_pipeline_id}/historico", response_model=List[CompanyStageHistoryResposta])
def obter_historico(
    company_pipeline_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Obter histórico de movimentações"""
    # Verificar permissão
    verificar_permissao_company_pipeline(company_pipeline_id, usuario, db)
    
    return db.query(CompanyStageHistory).options(
        joinedload(CompanyStageHistory.stage_anterior),
        joinedload(CompanyStageHistory.stage_novo),
        joinedload(CompanyStageHistory.usuario)
    ).filter(
        CompanyStageHistory.company_pipeline_id == company_pipeline_id
    ).order_by(CompanyStageHistory.data_movimentacao.desc()).all()

# ===================== NOTAS =====================

@router.post("/notes", response_model=NoteResposta)
def criar_nota(
    nota: NoteCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Criar nota"""
    # Verificar permissão
    company = verificar_permissao_company_pipeline(nota.company_pipeline_id, usuario, db)
    
    nova_nota = Note(**nota.model_dump(), usuario_id=usuario.id)
    db.add(nova_nota)
    
    registrar_atividade(
        db, usuario.id, company.empresa_id, "nota",
        f"Adicionou nota: {nota.titulo or nota.conteudo[:50]}"
    )
    
    db.commit()
    db.refresh(nova_nota)
    
    return db.query(Note).options(
        joinedload(Note.usuario)
    ).filter(Note.id == nova_nota.id).first()

@router.get("/companies/{company_pipeline_id}/notes", response_model=List[NoteResposta])
def listar_notas(
    company_pipeline_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Listar notas de uma empresa"""
    # Verificar permissão
    verificar_permissao_company_pipeline(company_pipeline_id, usuario, db)
    
    return db.query(Note).options(
        joinedload(Note.usuario)
    ).filter(
        Note.company_pipeline_id == company_pipeline_id
    ).order_by(Note.criado_em.desc()).all()

@router.put("/notes/{note_id}", response_model=NoteResposta)
def atualizar_nota(
    note_id: int,
    nota_data: NoteAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Atualizar nota"""
    nota = db.query(Note).filter(Note.id == note_id).first()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    # Apenas o criador ou admin pode editar
    if usuario.tipo != "admin" and nota.usuario_id != usuario.id:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    for key, value in nota_data.model_dump(exclude_unset=True).items():
        setattr(nota, key, value)
    
    db.commit()
    db.refresh(nota)
    return nota

@router.delete("/notes/{note_id}")
def deletar_nota(
    note_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Deletar nota"""
    nota = db.query(Note).filter(Note.id == note_id).first()
    if not nota:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    # Apenas o criador ou admin pode deletar
    if usuario.tipo != "admin" and nota.usuario_id != usuario.id:
        raise HTTPException(status_code=403, detail="Sem permissão")
    
    db.delete(nota)
    db.commit()
    return {"message": "Nota deletada"}

# ===================== ESTATÍSTICAS =====================

@router.get("/stats", response_model=PipelineStats)
def obter_estatisticas(
    linha: Optional[str] = None,
    consultor_id: Optional[int] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Obter estatísticas do pipeline"""
    query = db.query(CompanyPipeline).filter(CompanyPipeline.ativo == True)
    
    if linha:
        query = query.filter(CompanyPipeline.linha == linha)
    
    # SEGURANÇA: Consultores não-admin só podem ver suas próprias estatísticas
    if usuario.tipo != "admin":
        # Ignorar consultor_id passado e forçar o do usuário atual
        query = query.filter(CompanyPipeline.consultor_id == usuario.id)
    elif consultor_id:
        # Admin pode filtrar por consultor_id se quiser
        query = query.filter(CompanyPipeline.consultor_id == consultor_id)
    
    total_empresas = query.count()
    valor_total = query.with_entities(
        func.sum(CompanyPipeline.valor_estimado)
    ).scalar() or 0.0
    
    # Empresas por estágio
    empresas_por_stage = {}
    stages = db.query(Stage).filter(Stage.ativo == True).all()
    for stage in stages:
        count = query.filter(CompanyPipeline.stage_id == stage.id).count()
        empresas_por_stage[stage.nome] = count
    
    # Empresas paradas (mais de 7 dias no mesmo estágio)
    data_limite = datetime.utcnow() - timedelta(days=7)
    empresas_paradas = query.filter(
        CompanyPipeline.data_entrada_stage < data_limite
    ).count()
    
    return PipelineStats(
        total_empresas=total_empresas,
        valor_total=valor_total,
        empresas_por_stage=empresas_por_stage,
        empresas_paradas=empresas_paradas
    )

# ===================== ATIVIDADES =====================

@router.get("/activities", response_model=List[ActivityResposta])
def listar_atividades(
    empresa_id: Optional[int] = None,
    usuario_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Listar atividades do sistema"""
    query = db.query(Activity).options(
        joinedload(Activity.usuario)
    ).order_by(Activity.criado_em.desc())
    
    # SEGURANÇA: Consultores não-admin só veem suas próprias atividades
    if usuario.tipo != "admin":
        query = query.filter(Activity.usuario_id == usuario.id)
    else:
        # Admin pode filtrar por usuario_id se quiser
        if usuario_id:
            query = query.filter(Activity.usuario_id == usuario_id)
        
        if empresa_id:
            query = query.filter(Activity.empresa_id == empresa_id)
    
    return query.limit(limit).all()

# ===================== FUNÇÕES AUXILIARES =====================

def verificar_permissao_company_pipeline(
    company_pipeline_id: int,
    usuario: Usuario,
    db: Session
) -> CompanyPipeline:
    """Verifica se o usuário tem permissão para acessar a empresa no pipeline"""
    company = db.query(CompanyPipeline).filter(
        CompanyPipeline.id == company_pipeline_id
    ).first()
    
    if not company:
        raise HTTPException(status_code=404, detail="Empresa não encontrada no pipeline")
    
    # Admin tem acesso a tudo
    if usuario.tipo == "admin":
        return company
    
    # Consultor só pode acessar suas próprias empresas
    if company.consultor_id != usuario.id:
        raise HTTPException(
            status_code=403,
            detail="Você não tem permissão para acessar esta empresa"
        )
    
    return company

def registrar_atividade(
    db: Session,
    usuario_id: int,
    empresa_id: Optional[int],
    tipo: str,
    descricao: str,
    dados_json: Optional[dict] = None
):
    """Função auxiliar para registrar atividades"""
    atividade = Activity(
        usuario_id=usuario_id,
        empresa_id=empresa_id,
        tipo=tipo,
        descricao=descricao,
        dados_json=json.dumps(dados_json) if dados_json else None
    )
    db.add(atividade)
    # Não faz commit aqui, será feito na função chamadora
