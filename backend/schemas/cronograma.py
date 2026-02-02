from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from backend.models.cronograma import StatusProjeto, StatusAtividade, CategoriaEvento, PeriodoEvento


class CronogramaProjetoBase(BaseModel):
    proposta: Optional[str] = None
    empresa_id: Optional[int] = None
    cnpj: Optional[str] = None
    sigla: Optional[str] = None
    er: Optional[str] = None
    porte: Optional[str] = None
    solucao: Optional[str] = None
    horas_totais: Optional[float] = 0
    consultor_id: Optional[int] = None
    consultor_nome: Optional[str] = None
    data_inicio: Optional[date] = None
    data_termino: Optional[date] = None
    endereco: Optional[str] = None
    regiao: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    contato: Optional[str] = None
    telefone: Optional[str] = None
    celular: Optional[str] = None
    status: StatusProjeto = StatusProjeto.planejado
    observacoes: Optional[str] = None


class CronogramaProjetoCriar(CronogramaProjetoBase):
    pass


class CronogramaProjetoAtualizar(BaseModel):
    proposta: Optional[str] = None
    empresa_id: Optional[int] = None
    cnpj: Optional[str] = None
    sigla: Optional[str] = None
    er: Optional[str] = None
    porte: Optional[str] = None
    solucao: Optional[str] = None
    horas_totais: Optional[float] = None
    consultor_id: Optional[int] = None
    consultor_nome: Optional[str] = None
    data_inicio: Optional[date] = None
    data_termino: Optional[date] = None
    endereco: Optional[str] = None
    regiao: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    contato: Optional[str] = None
    telefone: Optional[str] = None
    celular: Optional[str] = None
    status: Optional[StatusProjeto] = None
    observacoes: Optional[str] = None


class CronogramaProjetoResposta(CronogramaProjetoBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    data_criacao: datetime
    data_atualizacao: datetime


class CronogramaAtividadeBase(BaseModel):
    projeto_id: int
    titulo: str
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    data_inicio: date
    data_fim: date
    carga_horas: Optional[float] = 0
    status: StatusAtividade = StatusAtividade.pendente
    responsavel_id: Optional[int] = None
    observacoes: Optional[str] = None


class CronogramaAtividadeCriar(CronogramaAtividadeBase):
    pass


class CronogramaAtividadeAtualizar(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    tipo: Optional[str] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    carga_horas: Optional[float] = None
    status: Optional[StatusAtividade] = None
    responsavel_id: Optional[int] = None
    observacoes: Optional[str] = None


class CronogramaAtividadeResposta(CronogramaAtividadeBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    data_criacao: datetime
    data_atualizacao: datetime


class TimelineItem(BaseModel):
    id: int
    titulo: str
    tipo: str
    data_inicio: date
    data_fim: date
    consultor_nome: Optional[str] = None
    empresa_nome: Optional[str] = None
    status: str
    progresso: Optional[float] = 0


class CronogramaFiltros(BaseModel):
    consultor_id: Optional[int] = None
    empresa_id: Optional[int] = None
    data_inicio: Optional[date] = None
    data_fim: Optional[date] = None
    status: Optional[StatusProjeto] = None


class ConsultorSimples(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    nome: str


class CronogramaEventoBase(BaseModel):
    data: date
    categoria: CategoriaEvento
    periodo: PeriodoEvento = PeriodoEvento.dia_todo
    sigla_empresa: Optional[str] = None
    empresa_id: Optional[int] = None
    consultor_id: int
    projeto_id: Optional[int] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    observacoes: Optional[str] = None


class CronogramaEventoCriar(CronogramaEventoBase):
    pass


class CronogramaEventoAtualizar(BaseModel):
    data: Optional[date] = None
    categoria: Optional[CategoriaEvento] = None
    periodo: Optional[PeriodoEvento] = None
    sigla_empresa: Optional[str] = None
    empresa_id: Optional[int] = None
    consultor_id: Optional[int] = None
    projeto_id: Optional[int] = None
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    observacoes: Optional[str] = None


class CronogramaEventoResposta(CronogramaEventoBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    data_criacao: datetime
    data_atualizacao: datetime
    consultor: Optional[ConsultorSimples] = None


class EventoCalendario(BaseModel):
    id: int
    data: date
    categoria: str
    categoria_nome: str
    periodo: str
    sigla_empresa: Optional[str] = None
    consultor_id: int
    consultor_nome: str
    titulo: Optional[str] = None
    cor: str
