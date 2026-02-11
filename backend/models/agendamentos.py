from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, Text, Enum
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime
import enum

class StatusAgendamento(str, enum.Enum):
    pendente = "pendente"
    realizado = "realizado"
    vencido = "vencido"
    reagendado = "reagendado"

class Agendamento(Base):
    __tablename__ = "agendamentos"

    id = Column(Integer, primary_key=True, index=True)
    prospeccao_id = Column(Integer, ForeignKey("prospeccoes.id"), nullable=False)
    data_agendada = Column(DateTime, nullable=False, index=True)
    status = Column(Enum(StatusAgendamento), default=StatusAgendamento.pendente)
    observacoes = Column(Text)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    
    reagendado_de_id = Column(Integer, ForeignKey("agendamentos.id"), nullable=True)
    reagendado_para_id = Column(Integer, ForeignKey("agendamentos.id"), nullable=True)

    prospeccao = relationship("Prospeccao", back_populates="agendamentos")
    reagendado_de = relationship("Agendamento", remote_side=[id], foreign_keys=[reagendado_de_id], backref="reagendamentos_posteriores")
