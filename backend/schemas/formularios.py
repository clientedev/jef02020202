from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any
from datetime import datetime

# Opções de Resposta
class OpcaoRespostaBase(BaseModel):
    texto: str
    descricao: Optional[str] = None
    valor: Optional[int] = None

class OpcaoRespostaCreate(OpcaoRespostaBase):
    pass

class OpcaoResposta(OpcaoRespostaBase):
    id: int
    pergunta_id: int
    
    class Config:
        from_attributes = True

# Perguntas
class PerguntaBase(BaseModel):
    texto: str
    tipo: str = "escala"
    categoria: Optional[str] = None
    descricao_categoria: Optional[str] = None
    ordem: int = 0
    obrigatoria: bool = True

class PerguntaCreate(PerguntaBase):
    opcoes: List[OpcaoRespostaCreate] = []

class Pergunta(PerguntaBase):
    id: int
    formulario_id: int
    opcoes: List[OpcaoResposta] = []
    
    class Config:
        from_attributes = True

# Formulários
class FormularioBase(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    tipo: str = "padrao"
    ativo: bool = True

class FormularioCreate(FormularioBase):
    perguntas: List[PerguntaCreate] = []

class FormularioUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None

class Formulario(FormularioBase):
    id: int
    criado_por: Optional[int] = None
    data_criacao: Optional[datetime] = None
    data_atualizacao: Optional[datetime] = None
    perguntas: List[Pergunta] = []
    
    class Config:
        from_attributes = True

class FormularioResumo(BaseModel):
    id: int
    titulo: str
    descricao: Optional[str] = None
    tipo: str
    ativo: bool
    data_criacao: Optional[datetime] = None
    total_perguntas: int = 0
    total_envios: int = 0
    total_respostas: int = 0
    
    class Config:
        from_attributes = True

# Envios
class FormularioEnvioCreate(BaseModel):
    formulario_id: int
    empresa_id: Optional[int] = None
    email_destinatario: Optional[str] = None
    nome_destinatario: Optional[str] = None

class FormularioEnvio(BaseModel):
    id: int
    formulario_id: int
    empresa_id: Optional[int] = None
    codigo_unico: str
    email_destinatario: Optional[str] = None
    nome_destinatario: Optional[str] = None
    respondido: bool
    data_envio: Optional[datetime] = None
    data_resposta: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class FormularioEnvioDetalhado(FormularioEnvio):
    formulario: Optional[Formulario] = None
    empresa_nome: Optional[str] = None
    
    class Config:
        from_attributes = True

# Respostas
class RespostaCreate(BaseModel):
    pergunta_id: int
    valor_numerico: Optional[int] = None
    valor_texto: Optional[str] = None
    valores_multiplos: Optional[List[Any]] = None

class FormularioRespostaSubmit(BaseModel):
    respostas: List[RespostaCreate]

class Resposta(BaseModel):
    id: int
    envio_id: int
    pergunta_id: int
    valor_numerico: Optional[int] = None
    valor_texto: Optional[str] = None
    valores_multiplos: Optional[List[Any]] = None
    data_resposta: Optional[datetime] = None
    
    class Config:
        from_attributes = True

# Para visualização de respostas
class RespostaVisualizacao(BaseModel):
    pergunta_texto: str
    categoria: Optional[str] = None
    valor_numerico: Optional[int] = None
    valor_texto: Optional[str] = None
    opcao_texto: Optional[str] = None
    
    class Config:
        from_attributes = True

class EnvioComRespostas(FormularioEnvio):
    respostas: List[RespostaVisualizacao] = []
    formulario_titulo: Optional[str] = None
    empresa_nome: Optional[str] = None
    
    class Config:
        from_attributes = True

# Estatísticas
class EstatisticasFormulario(BaseModel):
    formulario_id: int
    titulo: str
    total_envios: int
    total_respostas: int
    taxa_resposta: float
    media_por_pergunta: Optional[dict] = None
