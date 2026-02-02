from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime

class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    empresa = Column(String, nullable=False, index=True)
    cnpj = Column(String(50), unique=True, index=True)
    sigla = Column(String(50))
    porte = Column(String(50))
    er = Column(String(50))
    carteira = Column(String(50))
    endereco = Column(String(500))
    bairro = Column(String(200))
    zona = Column(String(100))
    municipio = Column(String(200), index=True)
    estado = Column(String(10))
    pais = Column(String(200))
    area = Column(String(200))
    cnae_principal = Column(String(50))
    descricao_cnae = Column(Text)
    tipo_empresa = Column(String(200))
    data_cadastro = Column(DateTime, default=datetime.utcnow)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    numero_funcionarios = Column(Integer)
    observacao = Column(Text)
    
    nome_contato = Column(String(200))
    cargo_contato = Column(String(200))
    telefone_contato = Column(String(50))
    email_contato = Column(String(200))

    prospeccoes = relationship("Prospeccao", back_populates="empresa")
    atribuicoes = relationship("AtribuicaoEmpresa", back_populates="empresa")
    cronograma_projetos = relationship("CronogramaProjeto", back_populates="empresa")
    pipeline_entries = relationship("CompanyPipeline", back_populates="empresa")
