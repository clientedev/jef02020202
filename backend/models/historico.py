from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime

class HistoricoEmpresa(Base):
    __tablename__ = "historico_empresa"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    data = Column(DateTime, default=datetime.utcnow, nullable=False)
    tipo_acao = Column(String(100), nullable=False) # e.g., "Agendamento", "Prospecção", "Reagendamento"
    detalhes = Column(Text)
    
    empresa = relationship("Empresa", back_populates="historico")
    usuario = relationship("Usuario")
