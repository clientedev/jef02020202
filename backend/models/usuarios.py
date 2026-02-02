from sqlalchemy import Column, Integer, String, Enum, Date, Text
from sqlalchemy.orm import relationship
from backend.database import Base
import enum

class TipoUsuario(str, enum.Enum):
    admin = "admin"
    consultor = "consultor"

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    senha_hash = Column(String, nullable=False)
    tipo = Column(Enum(TipoUsuario), nullable=False, default=TipoUsuario.consultor)
    
    telefone = Column(String(20), nullable=True)
    data_nascimento = Column(Date, nullable=True)
    modelo_carro = Column(String(200), nullable=True)
    placa_carro = Column(String(20), nullable=True, index=True)
    informacoes_basicas = Column(Text, nullable=True)
    foto_url = Column(String(500), nullable=True)
    
    empresas_atribuidas = relationship("AtribuicaoEmpresa", back_populates="consultor")
    prospeccoes = relationship("Prospeccao", foreign_keys="Prospeccao.consultor_id")
    cronograma_projetos = relationship("CronogramaProjeto", back_populates="consultor", foreign_keys="CronogramaProjeto.consultor_id")
    eventos_cronograma = relationship("CronogramaEvento", back_populates="consultor", foreign_keys="CronogramaEvento.consultor_id")
