from pydantic import BaseModel
from typing import Optional, List
from backend.schemas.crm import ContatoResposta
from datetime import datetime, date

class EmpresaBase(BaseModel):
    empresa: str
    cnpj: Optional[str] = None
    sigla: Optional[str] = None
    porte: Optional[str] = None
    er: Optional[str] = None
    carteira: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    zona: Optional[str] = None
    municipio: Optional[str] = None
    estado: Optional[str] = None
    pais: Optional[str] = None
    area: Optional[str] = None
    cnae_principal: Optional[str] = None
    descricao_cnae: Optional[str] = None
    tipo_empresa: Optional[str] = None
    numero_funcionarios: Optional[int] = None
    observacao: Optional[str] = None
    nome_contato: Optional[str] = None
    cargo_contato: Optional[str] = None
    telefone_contato: Optional[str] = None
    email_contato: Optional[str] = None
    cep: Optional[str] = None
    proxima_etapa: Optional[str] = None
    data_proxima_etapa: Optional[date] = None

class EmpresaCriar(EmpresaBase):
    pass

class EmpresaAtualizar(BaseModel):
    empresa: Optional[str] = None
    cnpj: Optional[str] = None
    sigla: Optional[str] = None
    porte: Optional[str] = None
    er: Optional[str] = None
    carteira: Optional[str] = None
    endereco: Optional[str] = None
    bairro: Optional[str] = None
    zona: Optional[str] = None
    municipio: Optional[str] = None
    estado: Optional[str] = None
    pais: Optional[str] = None
    area: Optional[str] = None
    cnae_principal: Optional[str] = None
    descricao_cnae: Optional[str] = None
    tipo_empresa: Optional[str] = None
    numero_funcionarios: Optional[int] = None
    observacao: Optional[str] = None
    nome_contato: Optional[str] = None
    cargo_contato: Optional[str] = None
    telefone_contato: Optional[str] = None
    email_contato: Optional[str] = None
    cep: Optional[str] = None
    proxima_etapa: Optional[str] = None
    data_proxima_etapa: Optional[date] = None

class EmpresaResposta(EmpresaBase):
    id: int
    data_cadastro: datetime
    data_atualizacao: datetime
    contatos: List[ContatoResposta] = []

    class Config:
        from_attributes = True
