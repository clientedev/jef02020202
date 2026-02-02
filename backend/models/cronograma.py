from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum as SQLEnum, Date, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend.database import Base


class StatusProjeto(str, enum.Enum):
    planejado = "planejado"
    em_andamento = "em_andamento"
    concluido = "concluido"
    cancelado = "cancelado"
    pausado = "pausado"


class StatusAtividade(str, enum.Enum):
    pendente = "pendente"
    em_andamento = "em_andamento"
    concluida = "concluida"
    cancelada = "cancelada"


class CategoriaEvento(str, enum.Enum):
    consultoria = "C"
    kickoff = "K"
    reuniao_final = "F"
    mentoria = "M"
    diagnostico = "T"
    programado = "P"
    outros = "O"


class PeriodoEvento(str, enum.Enum):
    manha = "M"
    tarde = "T"
    dia_todo = "D"


class CronogramaProjeto(Base):
    __tablename__ = "cronograma_projetos"
    
    id = Column(Integer, primary_key=True, index=True)
    proposta = Column(String(100), index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    cnpj = Column(String(18), index=True)
    sigla = Column(String(100), index=True)
    er = Column(String(200))
    porte = Column(String(50))
    solucao = Column(Text)
    horas_totais = Column(Float, default=0)
    consultor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    consultor_nome = Column(String(200))
    data_inicio = Column(Date)
    data_termino = Column(Date)
    endereco = Column(Text)
    regiao = Column(String(200))
    municipio = Column(String(200))
    uf = Column(String(50))
    contato = Column(String(200))
    telefone = Column(String(50))
    celular = Column(String(50))
    status = Column(SQLEnum(StatusProjeto), default=StatusProjeto.planejado)
    observacoes = Column(Text)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    empresa = relationship("Empresa", back_populates="cronograma_projetos")
    consultor = relationship("Usuario", back_populates="cronograma_projetos")
    atividades = relationship("CronogramaAtividade", back_populates="projeto", cascade="all, delete-orphan")


class CronogramaAtividade(Base):
    __tablename__ = "cronograma_atividades"
    
    id = Column(Integer, primary_key=True, index=True)
    projeto_id = Column(Integer, ForeignKey("cronograma_projetos.id"), nullable=False)
    titulo = Column(String(300), nullable=False)
    descricao = Column(Text)
    tipo = Column(String(100))
    data_inicio = Column(Date, nullable=False)
    data_fim = Column(Date, nullable=False)
    carga_horas = Column(Float, default=0)
    status = Column(SQLEnum(StatusAtividade), default=StatusAtividade.pendente)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    observacoes = Column(Text)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    projeto = relationship("CronogramaProjeto", back_populates="atividades")
    responsavel = relationship("Usuario")


class CronogramaEvento(Base):
    __tablename__ = "cronograma_eventos"
    
    id = Column(Integer, primary_key=True, index=True)
    data = Column(Date, nullable=False, index=True)
    categoria = Column(SQLEnum(CategoriaEvento), nullable=False, index=True)
    periodo = Column(SQLEnum(PeriodoEvento), default=PeriodoEvento.dia_todo)
    sigla_empresa = Column(String(100), index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    consultor_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    projeto_id = Column(Integer, ForeignKey("cronograma_projetos.id"), nullable=True)
    program_id = Column(Integer, ForeignKey("programs.id"), nullable=True)
    titulo = Column(String(300))
    descricao = Column(Text)
    observacoes = Column(Text)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    data_atualizacao = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    empresa = relationship("Empresa")
    consultor = relationship("Usuario", back_populates="eventos_cronograma")
    projeto = relationship("CronogramaProjeto")
    program = relationship("Program", back_populates="eventos")


class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(200), nullable=False)
    carga_horaria = Column(Float, nullable=False)  # Horas totais do programa
    descricao = Column(Text)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    data_criacao = Column(DateTime, default=datetime.utcnow)

    empresa = relationship("Empresa")
    eventos = relationship("CronogramaEvento", back_populates="program")
