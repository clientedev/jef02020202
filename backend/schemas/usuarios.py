from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date

class UsuarioBase(BaseModel):
    email: EmailStr
    nome: str
    tipo: str

class UsuarioCriar(UsuarioBase):
    senha: str

class UsuarioAtualizar(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    senha: Optional[str] = None
    tipo: Optional[str] = None
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None
    modelo_carro: Optional[str] = None
    placa_carro: Optional[str] = None
    informacoes_basicas: Optional[str] = None
    foto_url: Optional[str] = None

class UsuarioResposta(UsuarioBase):
    id: int
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None
    modelo_carro: Optional[str] = None
    placa_carro: Optional[str] = None
    informacoes_basicas: Optional[str] = None
    foto_url: Optional[str] = None

    class Config:
        from_attributes = True

class ConsultorPerfil(BaseModel):
    id: int
    nome: str
    email: EmailStr
    telefone: Optional[str] = None
    data_nascimento: Optional[date] = None
    modelo_carro: Optional[str] = None
    placa_carro: Optional[str] = None
    informacoes_basicas: Optional[str] = None
    foto_url: Optional[str] = None
    
    class Config:
        from_attributes = True

class UsuarioLogin(BaseModel):
    email: EmailStr
    senha: str

class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResposta
