from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from backend.database import Base

class Contato(Base):
    __tablename__ = "contatos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    nome = Column(String(200), nullable=False)
    email = Column(String(200))
    celular = Column(String(50))
    cargo = Column(String(200))
    
    # Novos campos
    ponto_focal = Column(Boolean, default=False)
    proprietario_socio = Column(Boolean, default=False)
    telefone_fixo = Column(String(50))
    celular2 = Column(String(50))
    emails_voltaram = Column(Boolean, default=False)
    observacoes = Column(Text)

    empresa = relationship("Empresa", back_populates="contatos")
