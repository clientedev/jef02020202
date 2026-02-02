from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean, Enum
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime
import enum

class TipoNotificacao(str, enum.Enum):
    PROSPECCAO_CRIADA = "prospeccao_criada"
    AGENDAMENTO_CRIADO = "agendamento_criado"
    AGENDAMENTO_REALIZADO = "agendamento_realizado"
    EMPRESA_ATRIBUIDA = "empresa_atribuida"
    PROSPECCAO_ATUALIZADA = "prospeccao_atualizada"

class Notificacao(Base):
    __tablename__ = "notificacoes"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(Enum(TipoNotificacao), nullable=False)
    titulo = Column(String(200), nullable=False)
    mensagem = Column(Text, nullable=False)
    usuario_origem_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    usuario_destino_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    lida = Column(Boolean, default=False)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    link = Column(String(500), nullable=True)

    usuario_origem = relationship("Usuario", foreign_keys=[usuario_origem_id])
    usuario_destino = relationship("Usuario", foreign_keys=[usuario_destino_id])
