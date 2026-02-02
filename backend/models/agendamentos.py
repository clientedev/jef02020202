from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, Text, Enum
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime
import enum

class StatusAgendamento(str, enum.Enum):
    pendente = "pendente"
    realizado = "realizado"
    vencido = "vencido"

class Agendamento(Base):
    __tablename__ = "agendamentos"

    id = Column(Integer, primary_key=True, index=True)
    prospeccao_id = Column(Integer, ForeignKey("prospeccoes.id"), nullable=False)
    data_agendada = Column(DateTime, nullable=False, index=True)
    status = Column(Enum(StatusAgendamento), default=StatusAgendamento.pendente)
    observacoes = Column(Text)
    data_criacao = Column(DateTime, default=datetime.utcnow)

    prospeccao = relationship("Prospeccao", back_populates="agendamentos")
