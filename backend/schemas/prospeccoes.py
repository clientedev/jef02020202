from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date, time

class EmpresaResumo(BaseModel):
    id: int
    empresa: str
    municipio: Optional[str] = None
    estado: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class UsuarioResumo(BaseModel):
    id: int
    nome: str
    email: str
    
    model_config = ConfigDict(from_attributes=True)

class ProspeccaoBase(BaseModel):
    empresa_id: int
    consultor_id: int
    data_ligacao: Optional[date] = None
    hora_ligacao: Optional[time] = None
    resultado: Optional[str] = None
    observacoes: Optional[str] = None
    
    porte: Optional[str] = None
    lr: Optional[str] = None
    id_externo: Optional[str] = None
    cfr: Optional[str] = None
    tipo_producao: Optional[str] = None
    data_prospeccao: Optional[date] = None
    follow_up: Optional[date] = None
    
    nome_contato: Optional[str] = None
    cargo: Optional[str] = None
    celular: Optional[str] = None
    telefone: Optional[str] = None
    telefone_contato: Optional[str] = None
    email_contato: Optional[str] = None
    cargo_contato: Optional[str] = None
    cnpj: Optional[str] = None
    
    status_prospeccao: Optional[str] = None
    responsavel: Optional[str] = None
    opcoes: Optional[str] = None
    retorno: Optional[str] = None
    observacoes_prospeccao: Optional[str] = None
    
    interesse_treinamento: bool = False
    interesse_consultoria: bool = False
    interesse_certificacao: bool = False
    interesse_eventos: bool = False
    interesse_produtos: bool = False
    interesse_seguranca: bool = False
    interesse_meio_ambiente: bool = False
    outros_interesses: Optional[str] = None
    
    potencial_negocio: Optional[str] = None
    status_follow_up: Optional[str] = None
    proxima_prospeccao_data: Optional[date] = None

class ProspeccaoCriar(ProspeccaoBase):
    pass

class ProspeccaoAtualizar(BaseModel):
    empresa_id: Optional[int] = None
    consultor_id: Optional[int] = None
    data_ligacao: Optional[date] = None
    hora_ligacao: Optional[time] = None
    resultado: Optional[str] = None
    observacoes: Optional[str] = None
    
    porte: Optional[str] = None
    lr: Optional[str] = None
    id_externo: Optional[str] = None
    cfr: Optional[str] = None
    tipo_producao: Optional[str] = None
    data_prospeccao: Optional[date] = None
    follow_up: Optional[date] = None
    
    nome_contato: Optional[str] = None
    cargo: Optional[str] = None
    celular: Optional[str] = None
    telefone: Optional[str] = None
    telefone_contato: Optional[str] = None
    email_contato: Optional[str] = None
    cargo_contato: Optional[str] = None
    cnpj: Optional[str] = None
    
    status_prospeccao: Optional[str] = None
    responsavel: Optional[str] = None
    opcoes: Optional[str] = None
    retorno: Optional[str] = None
    observacoes_prospeccao: Optional[str] = None
    
    interesse_treinamento: Optional[bool] = None
    interesse_consultoria: Optional[bool] = None
    interesse_certificacao: Optional[bool] = None
    interesse_eventos: Optional[bool] = None
    interesse_produtos: Optional[bool] = None
    interesse_seguranca: Optional[bool] = None
    interesse_meio_ambiente: Optional[bool] = None
    outros_interesses: Optional[str] = None
    
    potencial_negocio: Optional[str] = None
    status_follow_up: Optional[str] = None
    proxima_prospeccao_data: Optional[date] = None

class ProspeccaoHistoricoResposta(BaseModel):
    id: int
    prospeccao_id: int
    usuario_id: int
    data_alteracao: datetime
    tipo_alteracao: str
    campo_alterado: Optional[str] = None
    valor_anterior: Optional[str] = None
    valor_novo: Optional[str] = None
    descricao: Optional[str] = None
    usuario: Optional[UsuarioResumo] = None
    
    model_config = ConfigDict(from_attributes=True)

class ProspeccaoResposta(ProspeccaoBase):
    id: int
    codigo: Optional[str] = None
    data_criacao: datetime
    data_atualizacao: Optional[datetime] = None
    empresa: Optional[EmpresaResumo] = None
    consultor: Optional[UsuarioResumo] = None

    model_config = ConfigDict(from_attributes=True)

class ProspeccaoComHistorico(ProspeccaoResposta):
    historico: List[ProspeccaoHistoricoResposta] = []
    
    model_config = ConfigDict(from_attributes=True)
