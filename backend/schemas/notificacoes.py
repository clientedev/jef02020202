from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from backend.models.notificacoes import TipoNotificacao

class UsuarioNotificacao(BaseModel):
    id: int
    nome: str
    
    model_config = ConfigDict(from_attributes=True)

class NotificacaoBase(BaseModel):
    tipo: TipoNotificacao
    titulo: str
    mensagem: str
    link: Optional[str] = None

class NotificacaoCriar(NotificacaoBase):
    usuario_origem_id: int
    usuario_destino_id: Optional[int] = None

class NotificacaoResposta(NotificacaoBase):
    id: int
    usuario_origem_id: int
    usuario_destino_id: Optional[int] = None
    lida: bool
    data_criacao: datetime
    usuario_origem: Optional[UsuarioNotificacao] = None
    
    model_config = ConfigDict(from_attributes=True)

class NotificacaoAtualizar(BaseModel):
    lida: bool
