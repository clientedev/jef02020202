from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any

class MensagemBase(BaseModel):
    destinatario_id: int
    conteudo: str
    tipo: str = "texto"

class MensagemCriar(MensagemBase):
    resposta_para_id: Optional[int] = None
    anexo_url: Optional[str] = None
    anexo_nome: Optional[str] = None
    anexo_tamanho: Optional[int] = None

class MensagemEditar(BaseModel):
    conteudo: str

class MensagemReacao(BaseModel):
    emoji: str

class UsuarioSimples(BaseModel):
    id: int
    nome: str
    email: str
    foto_url: Optional[str] = None
    tipo: Optional[str] = None
    telefone: Optional[str] = None
    
    class Config:
        from_attributes = True

class UsuarioStatus(BaseModel):
    id: int
    nome: str
    email: str
    foto_url: Optional[str] = None
    online: bool = False
    ultima_atividade: Optional[datetime] = None
    digitando: bool = False
    
    class Config:
        from_attributes = True

class MensagemResumida(BaseModel):
    id: int
    conteudo: str
    remetente: UsuarioSimples
    
    class Config:
        from_attributes = True

class MensagemResposta(BaseModel):
    id: int
    remetente_id: int
    destinatario_id: int
    conteudo: str
    tipo: str = "texto"
    status: str = "enviada"
    data_envio: datetime
    lida: bool
    data_leitura: Optional[datetime] = None
    data_entrega: Optional[datetime] = None
    editada: bool = False
    data_edicao: Optional[datetime] = None
    deletada: bool = False
    resposta_para_id: Optional[int] = None
    anexo_url: Optional[str] = None
    anexo_nome: Optional[str] = None
    anexo_tamanho: Optional[int] = None
    reacoes: Optional[Dict[str, List[int]]] = None
    remetente: UsuarioSimples
    destinatario: UsuarioSimples
    resposta_para: Optional[MensagemResumida] = None
    
    class Config:
        from_attributes = True

class ConversaResumo(BaseModel):
    usuario: UsuarioStatus
    ultima_mensagem: Optional[str] = None
    ultima_mensagem_tipo: Optional[str] = None
    data_ultima_mensagem: Optional[datetime] = None
    mensagens_nao_lidas: int = 0
    ultima_mensagem_minha: bool = False
    
    class Config:
        from_attributes = True

class StatusDigitando(BaseModel):
    digitando: bool
    destinatario_id: int

class GrupoCriar(BaseModel):
    nome: str
    descricao: Optional[str] = None
    foto_url: Optional[str] = None
    membros_ids: List[int] = []

class GrupoEditar(BaseModel):
    nome: Optional[str] = None
    descricao: Optional[str] = None
    foto_url: Optional[str] = None

class MembroGrupoSimples(BaseModel):
    id: int
    usuario: UsuarioSimples
    admin: bool
    silenciado: bool
    adicionado_em: datetime
    
    class Config:
        from_attributes = True

class GrupoResposta(BaseModel):
    id: int
    nome: str
    descricao: Optional[str] = None
    foto_url: Optional[str] = None
    criador: UsuarioSimples
    criado_em: datetime
    ativo: bool
    membros: List[MembroGrupoSimples] = []
    ultima_mensagem: Optional[str] = None
    data_ultima_mensagem: Optional[datetime] = None
    mensagens_nao_lidas: int = 0
    
    class Config:
        from_attributes = True

class MensagemGrupoCriar(BaseModel):
    grupo_id: int
    conteudo: str
    tipo: str = "texto"
    resposta_para_id: Optional[int] = None
    anexo_url: Optional[str] = None
    anexo_nome: Optional[str] = None
    anexo_tamanho: Optional[int] = None

class MensagemGrupoResposta(BaseModel):
    id: int
    grupo_id: int
    remetente_id: int
    conteudo: str
    tipo: str = "texto"
    data_envio: datetime
    editada: bool = False
    data_edicao: Optional[datetime] = None
    deletada: bool = False
    resposta_para_id: Optional[int] = None
    anexo_url: Optional[str] = None
    anexo_nome: Optional[str] = None
    anexo_tamanho: Optional[int] = None
    reacoes: Optional[Dict[str, List[int]]] = None
    remetente: UsuarioSimples
    
    class Config:
        from_attributes = True

class BuscaMensagens(BaseModel):
    termo: str
    usuario_id: Optional[int] = None
    data_inicio: Optional[datetime] = None
    data_fim: Optional[datetime] = None
