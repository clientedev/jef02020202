from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class ContatoBase(BaseModel):
    nome: str
    email: Optional[str] = None
    celular: Optional[str] = None
    cargo: Optional[str] = None
    ponto_focal: Optional[bool] = False
    proprietario_socio: Optional[bool] = False
    telefone_fixo: Optional[str] = None
    celular2: Optional[str] = None
    emails_voltaram: Optional[bool] = False
    observacoes: Optional[str] = None

class ContatoCriar(ContatoBase):
    empresa_id: int

class ContatoResposta(ContatoBase):
    id: int
    empresa_id: int
    
    model_config = ConfigDict(from_attributes=True)

class ContatoGlobalResposta(ContatoBase):
    id: int
    empresa_id: int
    empresa_nome: str
    
    model_config = ConfigDict(from_attributes=True)

class HistoricoEmpresaResposta(BaseModel):
    id: int
    empresa_id: int
    usuario_nome: str
    data: datetime
    tipo_acao: str
    detalhes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
