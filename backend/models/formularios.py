from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
import uuid
import secrets

def gerar_codigo_formulario():
    """Gera código único para link do formulário"""
    return secrets.token_urlsafe(16)

class Formulario(Base):
    __tablename__ = "formularios"
    
    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(500), nullable=False)
    descricao = Column(Text)
    tipo = Column(String(50), default="padrao")  # padrao, personalizado
    ativo = Column(Boolean, default=True)
    criado_por = Column(Integer, ForeignKey("usuarios.id"))
    data_criacao = Column(DateTime(timezone=True), server_default=func.now())
    data_atualizacao = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relacionamentos
    perguntas = relationship("Pergunta", back_populates="formulario", cascade="all, delete-orphan", order_by="Pergunta.ordem")
    envios = relationship("FormularioEnvio", back_populates="formulario", cascade="all, delete-orphan")
    criador = relationship("Usuario", foreign_keys=[criado_por])

class Pergunta(Base):
    __tablename__ = "perguntas"
    
    id = Column(Integer, primary_key=True, index=True)
    formulario_id = Column(Integer, ForeignKey("formularios.id", ondelete="CASCADE"), nullable=False)
    texto = Column(Text, nullable=False)
    tipo = Column(String(50), default="escala")  # escala, texto, multipla_escolha, checkbox
    categoria = Column(String(200))
    descricao_categoria = Column(Text)
    ordem = Column(Integer, default=0)
    obrigatoria = Column(Boolean, default=True)
    
    # Relacionamentos
    formulario = relationship("Formulario", back_populates="perguntas")
    opcoes = relationship("OpcaoResposta", back_populates="pergunta", cascade="all, delete-orphan", order_by="OpcaoResposta.valor")
    respostas = relationship("Resposta", back_populates="pergunta", cascade="all, delete-orphan")

class OpcaoResposta(Base):
    __tablename__ = "opcoes_resposta"
    
    id = Column(Integer, primary_key=True, index=True)
    pergunta_id = Column(Integer, ForeignKey("perguntas.id", ondelete="CASCADE"), nullable=False)
    texto = Column(String(500), nullable=False)
    descricao = Column(Text)
    valor = Column(Integer)  # Para escalas numéricas
    
    # Relacionamentos
    pergunta = relationship("Pergunta", back_populates="opcoes")

class FormularioEnvio(Base):
    __tablename__ = "formulario_envios"
    
    id = Column(Integer, primary_key=True, index=True)
    formulario_id = Column(Integer, ForeignKey("formularios.id", ondelete="CASCADE"), nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    codigo_unico = Column(String(100), unique=True, index=True, default=gerar_codigo_formulario)
    email_destinatario = Column(String(200))
    nome_destinatario = Column(String(200))
    respondido = Column(Boolean, default=False)
    data_envio = Column(DateTime(timezone=True), server_default=func.now())
    data_resposta = Column(DateTime(timezone=True))
    enviado_por = Column(Integer, ForeignKey("usuarios.id"))
    
    # Relacionamentos
    formulario = relationship("Formulario", back_populates="envios")
    empresa = relationship("Empresa")
    respostas = relationship("Resposta", back_populates="envio", cascade="all, delete-orphan")
    usuario_envio = relationship("Usuario", foreign_keys=[enviado_por])

class Resposta(Base):
    __tablename__ = "respostas"
    
    id = Column(Integer, primary_key=True, index=True)
    envio_id = Column(Integer, ForeignKey("formulario_envios.id", ondelete="CASCADE"), nullable=False)
    pergunta_id = Column(Integer, ForeignKey("perguntas.id", ondelete="CASCADE"), nullable=False)
    valor_numerico = Column(Integer)  # Para escalas
    valor_texto = Column(Text)  # Para texto livre
    valores_multiplos = Column(JSON)  # Para múltipla escolha
    data_resposta = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relacionamentos
    envio = relationship("FormularioEnvio", back_populates="respostas")
    pergunta = relationship("Pergunta", back_populates="respostas")
