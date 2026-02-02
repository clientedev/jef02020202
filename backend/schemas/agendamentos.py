from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AgendamentoBase(BaseModel):
    prospeccao_id: int
    data_agendada: datetime
    status: str = "pendente"
    observacoes: Optional[str] = None

class AgendamentoCriar(AgendamentoBase):
    pass

class AgendamentoAtualizar(BaseModel):
    data_agendada: Optional[datetime] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None

class AgendamentoResposta(AgendamentoBase):
    id: int
    data_criacao: datetime

    class Config:
        from_attributes = True
