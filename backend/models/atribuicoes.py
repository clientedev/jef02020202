from sqlalchemy import Column, Integer, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime

class AtribuicaoEmpresa(Base):
    __tablename__ = "atribuicoes_empresas"
    
    id = Column(Integer, primary_key=True, index=True)
    consultor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    ativa = Column(Boolean, default=True)
    data_atribuicao = Column(DateTime, default=datetime.utcnow)
    data_desativacao = Column(DateTime, nullable=True)
    
    consultor = relationship("Usuario", back_populates="empresas_atribuidas")
    empresa = relationship("Empresa", back_populates="atribuicoes")
