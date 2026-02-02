from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

# Schemas para Stage
class StageBase(BaseModel):
    nome: str
    descricao: Optional[str] = None
    cor: str = "#3b82f6"
    ordem: int
    ativo: bool = True

class StageCriar(StageBase):
    pass

class StageAtualizar(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    cor: Optional[str] = None
    ordem: Optional[int] = None
    ativo: Optional[bool] = None

class StageResposta(StageBase):
    id: int
    criado_em: datetime
    atualizado_em: datetime
    
    model_config = ConfigDict(from_attributes=True)

# Schemas para CompanyPipeline
class EmpresaResumo(BaseModel):
    id: int
    empresa: str
    cnpj: Optional[str] = None
    municipio: Optional[str] = None
    estado: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class UsuarioResumo(BaseModel):
    id: int
    nome: str
    email: str
    
    model_config = ConfigDict(from_attributes=True)

class CompanyPipelineBase(BaseModel):
    empresa_id: int
    stage_id: int
    consultor_id: Optional[int] = None
    linha: Optional[str] = None
    valor_estimado: Optional[float] = None
    probabilidade: Optional[int] = None
    data_prevista_fechamento: Optional[datetime] = None
    nome_contato: Optional[str] = None
    email_contato: Optional[str] = None
    telefone_contato: Optional[str] = None
    cargo_contato: Optional[str] = None

class CompanyPipelineCriar(CompanyPipelineBase):
    pass

class CompanyPipelineAtualizar(BaseModel):
    stage_id: Optional[int] = None
    consultor_id: Optional[int] = None
    linha: Optional[str] = None
    valor_estimado: Optional[float] = None
    probabilidade: Optional[int] = None
    data_prevista_fechamento: Optional[datetime] = None
    nome_contato: Optional[str] = None
    email_contato: Optional[str] = None
    telefone_contato: Optional[str] = None
    cargo_contato: Optional[str] = None
    ativo: Optional[bool] = None

class CompanyPipelineResposta(CompanyPipelineBase):
    id: int
    data_entrada_stage: datetime
    ativo: bool
    criado_em: datetime
    atualizado_em: datetime
    empresa: Optional[EmpresaResumo] = None
    stage: Optional[StageResposta] = None
    consultor: Optional[UsuarioResumo] = None
    
    model_config = ConfigDict(from_attributes=True)

# Schema para movimentação de stage
class MoverStageRequest(BaseModel):
    novo_stage_id: int
    observacoes: Optional[str] = None

# Schemas para CompanyStageHistory
class CompanyStageHistoryResposta(BaseModel):
    id: int
    company_pipeline_id: int
    stage_anterior_id: Optional[int] = None
    stage_novo_id: int
    usuario_id: Optional[int] = None
    observacoes: Optional[str] = None
    data_movimentacao: datetime
    stage_anterior: Optional[StageResposta] = None
    stage_novo: Optional[StageResposta] = None
    usuario: Optional[UsuarioResumo] = None
    
    model_config = ConfigDict(from_attributes=True)

# Schemas para Note
class NoteBase(BaseModel):
    titulo: Optional[str] = None
    conteudo: str
    tipo: str = "nota"
    importante: bool = False

class NoteCriar(NoteBase):
    company_pipeline_id: int

class NoteAtualizar(BaseModel):
    titulo: Optional[str] = None
    conteudo: Optional[str] = None
    tipo: Optional[str] = None
    importante: Optional[bool] = None

class NoteResposta(NoteBase):
    id: int
    company_pipeline_id: int
    usuario_id: Optional[int] = None
    criado_em: datetime
    atualizado_em: datetime
    usuario: Optional[UsuarioResumo] = None
    
    model_config = ConfigDict(from_attributes=True)

# Schemas para Attachment
class AttachmentBase(BaseModel):
    nome_arquivo: str
    tipo_arquivo: Optional[str] = None
    descricao: Optional[str] = None

class AttachmentResposta(AttachmentBase):
    id: int
    company_pipeline_id: int
    usuario_id: Optional[int] = None
    tamanho_bytes: Optional[int] = None
    caminho_arquivo: str
    criado_em: datetime
    usuario: Optional[UsuarioResumo] = None
    
    model_config = ConfigDict(from_attributes=True)

# Schemas para Activity
class ActivityResposta(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    empresa_id: Optional[int] = None
    tipo: str
    descricao: str
    dados_json: Optional[str] = None
    criado_em: datetime
    usuario: Optional[UsuarioResumo] = None
    
    model_config = ConfigDict(from_attributes=True)

# Schema consolidado para o pipeline com estatísticas
class PipelineStats(BaseModel):
    total_empresas: int
    valor_total: float
    empresas_por_stage: dict
    empresas_paradas: int  # Mais de 7 dias no mesmo estágio
