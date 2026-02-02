from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean, Enum, JSON
from sqlalchemy.orm import relationship
from backend.database import Base
from datetime import datetime
import enum

class TipoMensagem(str, enum.Enum):
    TEXTO = "texto"
    IMAGEM = "imagem"
    ARQUIVO = "arquivo"
    AUDIO = "audio"
    SISTEMA = "sistema"

class StatusMensagem(str, enum.Enum):
    ENVIADA = "enviada"
    ENTREGUE = "entregue"
    LIDA = "lida"

class Mensagem(Base):
    __tablename__ = "mensagens"
    
    id = Column(Integer, primary_key=True, index=True)
    remetente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    destinatario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    conteudo = Column(Text, nullable=False)
    tipo = Column(String(20), default="texto", nullable=False)
    status = Column(String(20), default="enviada", nullable=False)
    data_envio = Column(DateTime, default=datetime.utcnow, nullable=False)
    lida = Column(Boolean, default=False, nullable=False)
    data_leitura = Column(DateTime, nullable=True)
    data_entrega = Column(DateTime, nullable=True)
    editada = Column(Boolean, default=False, nullable=False)
    data_edicao = Column(DateTime, nullable=True)
    deletada = Column(Boolean, default=False, nullable=False)
    resposta_para_id = Column(Integer, ForeignKey("mensagens.id"), nullable=True)
    anexo_url = Column(String(500), nullable=True)
    anexo_nome = Column(String(255), nullable=True)
    anexo_tamanho = Column(Integer, nullable=True)
    reacoes = Column(JSON, default=dict, nullable=True)
    
    remetente = relationship("Usuario", foreign_keys=[remetente_id])
    destinatario = relationship("Usuario", foreign_keys=[destinatario_id])
    resposta_para = relationship("Mensagem", remote_side=[id], backref="respostas")

class StatusUsuario(Base):
    __tablename__ = "status_usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), unique=True, nullable=False)
    online = Column(Boolean, default=False, nullable=False)
    ultima_atividade = Column(DateTime, default=datetime.utcnow, nullable=False)
    digitando_para = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    digitando_desde = Column(DateTime, nullable=True)
    
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    digitando_para_usuario = relationship("Usuario", foreign_keys=[digitando_para])

class GrupoChat(Base):
    __tablename__ = "grupos_chat"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    descricao = Column(Text, nullable=True)
    foto_url = Column(String(500), nullable=True)
    criador_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ativo = Column(Boolean, default=True, nullable=False)
    
    criador = relationship("Usuario", foreign_keys=[criador_id])
    membros = relationship("MembroGrupo", back_populates="grupo", cascade="all, delete-orphan")

class MembroGrupo(Base):
    __tablename__ = "membros_grupo"
    
    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey("grupos_chat.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    admin = Column(Boolean, default=False, nullable=False)
    silenciado = Column(Boolean, default=False, nullable=False)
    adicionado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    adicionado_por = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    
    grupo = relationship("GrupoChat", back_populates="membros")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    adicionado_por_usuario = relationship("Usuario", foreign_keys=[adicionado_por])

class MensagemGrupo(Base):
    __tablename__ = "mensagens_grupo"
    
    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey("grupos_chat.id"), nullable=False)
    remetente_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    conteudo = Column(Text, nullable=False)
    tipo = Column(String(20), default="texto", nullable=False)
    data_envio = Column(DateTime, default=datetime.utcnow, nullable=False)
    editada = Column(Boolean, default=False, nullable=False)
    data_edicao = Column(DateTime, nullable=True)
    deletada = Column(Boolean, default=False, nullable=False)
    resposta_para_id = Column(Integer, ForeignKey("mensagens_grupo.id"), nullable=True)
    anexo_url = Column(String(500), nullable=True)
    anexo_nome = Column(String(255), nullable=True)
    anexo_tamanho = Column(Integer, nullable=True)
    reacoes = Column(JSON, default=dict, nullable=True)
    
    grupo = relationship("GrupoChat")
    remetente = relationship("Usuario", foreign_keys=[remetente_id])
    resposta_para = relationship("MensagemGrupo", remote_side=[id])

class LeituraGrupo(Base):
    __tablename__ = "leituras_grupo"
    
    id = Column(Integer, primary_key=True, index=True)
    grupo_id = Column(Integer, ForeignKey("grupos_chat.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    ultima_mensagem_lida_id = Column(Integer, ForeignKey("mensagens_grupo.id"), nullable=True)
    data_leitura = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    grupo = relationship("GrupoChat")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
