from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class Stage(Base):
    """Estágios do pipeline Kanban"""
    __tablename__ = "stages"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    descricao = Column(Text)
    cor = Column(String(20), default="#3b82f6")  # Cor hexadecimal
    ordem = Column(Integer, nullable=False)  # Ordem de exibição
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    empresas = relationship("CompanyPipeline", back_populates="stage")

class CompanyPipeline(Base):
    """Empresas no pipeline com estágio atual"""
    __tablename__ = "company_pipeline"
    
    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=False)
    stage_id = Column(Integer, ForeignKey("stages.id"), nullable=False)
    consultor_id = Column(Integer, ForeignKey("usuarios.id"))
    
    # Campos adicionais
    linha = Column(String(50))  # Tecnologia ou Educacional
    valor_estimado = Column(Float)
    probabilidade = Column(Integer)  # 0-100%
    data_entrada_stage = Column(DateTime, default=datetime.utcnow)
    data_prevista_fechamento = Column(DateTime)
    
    # Informações de contato
    nome_contato = Column(String(200))
    email_contato = Column(String(200))
    telefone_contato = Column(String(50))
    cargo_contato = Column(String(200))
    
    # Controle
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    empresa = relationship("Empresa", back_populates="pipeline_entries")
    stage = relationship("Stage", back_populates="empresas")
    consultor = relationship("Usuario", foreign_keys=[consultor_id])
    historico = relationship("CompanyStageHistory", back_populates="company_pipeline", cascade="all, delete-orphan")
    notas = relationship("Note", back_populates="company_pipeline", cascade="all, delete-orphan")
    anexos = relationship("Attachment", back_populates="company_pipeline", cascade="all, delete-orphan")

class CompanyStageHistory(Base):
    """Histórico de movimentações entre estágios"""
    __tablename__ = "company_stage_history"
    
    id = Column(Integer, primary_key=True, index=True)
    company_pipeline_id = Column(Integer, ForeignKey("company_pipeline.id"), nullable=False)
    stage_anterior_id = Column(Integer, ForeignKey("stages.id"))
    stage_novo_id = Column(Integer, ForeignKey("stages.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    
    observacoes = Column(Text)
    data_movimentacao = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company_pipeline = relationship("CompanyPipeline", back_populates="historico")
    stage_anterior = relationship("Stage", foreign_keys=[stage_anterior_id])
    stage_novo = relationship("Stage", foreign_keys=[stage_novo_id])
    usuario = relationship("Usuario", foreign_keys=[usuario_id])

class Note(Base):
    """Notas sobre empresas no pipeline"""
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    company_pipeline_id = Column(Integer, ForeignKey("company_pipeline.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    
    titulo = Column(String(200))
    conteudo = Column(Text, nullable=False)
    tipo = Column(String(50))  # 'nota', 'ligacao', 'reuniao', 'email'
    importante = Column(Boolean, default=False)
    
    criado_em = Column(DateTime, default=datetime.utcnow)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    company_pipeline = relationship("CompanyPipeline", back_populates="notas")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])

class Attachment(Base):
    """Anexos de documentos"""
    __tablename__ = "attachments"
    
    id = Column(Integer, primary_key=True, index=True)
    company_pipeline_id = Column(Integer, ForeignKey("company_pipeline.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    
    nome_arquivo = Column(String(255), nullable=False)
    tipo_arquivo = Column(String(100))
    tamanho_bytes = Column(Integer)
    caminho_arquivo = Column(String(500), nullable=False)
    descricao = Column(Text)
    
    criado_em = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    company_pipeline = relationship("CompanyPipeline", back_populates="anexos")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])

class Activity(Base):
    """Log de atividades do sistema"""
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))
    empresa_id = Column(Integer, ForeignKey("empresas.id"))
    
    tipo = Column(String(50), nullable=False)  # 'criacao', 'edicao', 'movimentacao', 'nota', 'anexo'
    descricao = Column(Text, nullable=False)
    dados_json = Column(Text)  # JSON com dados adicionais
    
    criado_em = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    empresa = relationship("Empresa", foreign_keys=[empresa_id])
