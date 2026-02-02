from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlalchemy.orm import Session
import httpx
import re
from typing import Optional
from backend.database import get_db
from backend.models import Empresa, Usuario
from backend.auth.security import obter_usuario_atual
from pydantic import BaseModel

router = APIRouter(prefix="/api/cnpj", tags=["CNPJ"])

class EmpresaCNPJ(BaseModel):
    cnpj: str
    empresa: str
    nome_fantasia: Optional[str] = None
    municipio: Optional[str] = None
    estado: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cep: Optional[str] = None
    telefone: Optional[str] = None
    email: Optional[str] = None
    atividade_principal: Optional[str] = None
    natureza_juridica: Optional[str] = None
    porte: Optional[str] = None
    data_abertura: Optional[str] = None
    situacao: Optional[str] = None

def limpar_cnpj(cnpj: str) -> str:
    return re.sub(r'[^0-9]', '', cnpj)

async def buscar_receitaws(cnpj: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"https://www.receitaws.com.br/v1/cnpj/{cnpj}")
            if response.status_code == 200:
                data = response.json()
                if data.get("status") != "ERROR":
                    return {
                        "cnpj": data.get("cnpj", ""),
                        "empresa": data.get("nome", ""),
                        "nome_fantasia": data.get("fantasia"),
                        "municipio": data.get("municipio"),
                        "estado": data.get("uf"),
                        "logradouro": data.get("logradouro"),
                        "numero": data.get("numero"),
                        "complemento": data.get("complemento"),
                        "bairro": data.get("bairro"),
                        "cep": data.get("cep"),
                        "telefone": data.get("telefone"),
                        "email": data.get("email"),
                        "atividade_principal": data.get("atividade_principal", [{}])[0].get("text") if data.get("atividade_principal") else None,
                        "natureza_juridica": data.get("natureza_juridica"),
                        "porte": data.get("porte"),
                        "data_abertura": data.get("abertura"),
                        "situacao": data.get("situacao"),
                        "fonte": "ReceitaWS"
                    }
    except Exception as e:
        print(f"Erro ReceitaWS: {e}")
    return None

async def buscar_brasilapi(cnpj: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}")
            if response.status_code == 200:
                data = response.json()
                return {
                    "cnpj": data.get("cnpj", ""),
                    "empresa": data.get("razao_social", ""),
                    "nome_fantasia": data.get("nome_fantasia"),
                    "municipio": data.get("municipio"),
                    "estado": data.get("uf"),
                    "logradouro": data.get("logradouro"),
                    "numero": data.get("numero"),
                    "complemento": data.get("complemento"),
                    "bairro": data.get("bairro"),
                    "cep": data.get("cep"),
                    "telefone": data.get("ddd_telefone_1"),
                    "email": data.get("email"),
                    "atividade_principal": data.get("cnae_fiscal_descricao"),
                    "natureza_juridica": data.get("natureza_juridica"),
                    "porte": data.get("porte"),
                    "data_abertura": data.get("data_inicio_atividade"),
                    "situacao": data.get("descricao_situacao_cadastral"),
                    "fonte": "BrasilAPI"
                }
    except Exception as e:
        print(f"Erro BrasilAPI: {e}")
    return None

async def buscar_cnpja(cnpj: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"https://publica.cnpj.ws/cnpj/{cnpj}")
            if response.status_code == 200:
                data = response.json()
                endereco = data.get("estabelecimento", {})
                
                telefone = None
                ddd1 = endereco.get("ddd1")
                telefone1 = endereco.get("telefone1")
                if ddd1 and telefone1:
                    telefone = str(ddd1) + str(telefone1)
                
                return {
                    "cnpj": cnpj,
                    "empresa": data.get("razao_social", ""),
                    "nome_fantasia": endereco.get("nome_fantasia"),
                    "municipio": endereco.get("cidade", {}).get("nome") if endereco.get("cidade") else None,
                    "estado": endereco.get("estado", {}).get("sigla") if endereco.get("estado") else None,
                    "logradouro": endereco.get("logradouro"),
                    "numero": endereco.get("numero"),
                    "complemento": endereco.get("complemento"),
                    "bairro": endereco.get("bairro"),
                    "cep": endereco.get("cep"),
                    "telefone": telefone,
                    "email": endereco.get("email"),
                    "atividade_principal": endereco.get("atividade_principal", {}).get("descricao") if endereco.get("atividade_principal") else None,
                    "natureza_juridica": data.get("natureza_juridica", {}).get("descricao") if data.get("natureza_juridica") else None,
                    "porte": data.get("porte", {}).get("descricao") if data.get("porte") else None,
                    "data_abertura": endereco.get("data_inicio_atividade"),
                    "situacao": endereco.get("situacao_cadastral"),
                    "fonte": "CNPJA"
                }
    except Exception as e:
        print(f"Erro CNPJA: {e}")
    return None

@router.get("/buscar/{cnpj}")
async def buscar_empresa_cnpj(
    cnpj: str,
    usuario: Usuario = Depends(obter_usuario_atual)
):
    cnpj_limpo = limpar_cnpj(cnpj)
    
    if len(cnpj_limpo) != 14:
        raise HTTPException(status_code=400, detail="CNPJ inválido. Deve conter 14 dígitos.")
    
    resultado = await buscar_receitaws(cnpj_limpo)
    
    if not resultado:
        resultado = await buscar_brasilapi(cnpj_limpo)
    
    if not resultado:
        resultado = await buscar_cnpja(cnpj_limpo)
    
    if not resultado:
        raise HTTPException(
            status_code=404,
            detail="CNPJ não encontrado em nenhuma API disponível. Verifique o número e tente novamente."
        )
    
    return resultado

@router.post("/salvar")
async def salvar_empresa_cnpj(
    empresa_data: EmpresaCNPJ,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    cnpj_limpo = limpar_cnpj(empresa_data.cnpj)
    
    empresa_existente = db.query(Empresa).filter(Empresa.cnpj == cnpj_limpo).first()
    if empresa_existente:
        raise HTTPException(
            status_code=400,
            detail=f"Empresa com CNPJ {cnpj_limpo} já existe na carteira."
        )
    
    endereco_completo = empresa_data.logradouro or ""
    if empresa_data.numero:
        endereco_completo += f", {empresa_data.numero}"
    if empresa_data.complemento:
        endereco_completo += f" - {empresa_data.complemento}"
    if empresa_data.cep:
        endereco_completo += f" - CEP: {empresa_data.cep}"
    
    observacao_dados = []
    if empresa_data.nome_fantasia:
        observacao_dados.append(f"Nome Fantasia: {empresa_data.nome_fantasia}")
    if empresa_data.telefone:
        observacao_dados.append(f"Telefone: {empresa_data.telefone}")
    if empresa_data.email:
        observacao_dados.append(f"Email: {empresa_data.email}")
    if empresa_data.data_abertura:
        observacao_dados.append(f"Data Abertura: {empresa_data.data_abertura}")
    if empresa_data.situacao:
        observacao_dados.append(f"Situação: {empresa_data.situacao}")
    
    observacao = " | ".join(observacao_dados) if observacao_dados else None
    
    nova_empresa = Empresa(
        cnpj=cnpj_limpo,
        empresa=empresa_data.empresa,
        municipio=empresa_data.municipio,
        estado=empresa_data.estado,
        endereco=endereco_completo or None,
        bairro=empresa_data.bairro,
        descricao_cnae=empresa_data.atividade_principal,
        tipo_empresa=empresa_data.natureza_juridica,
        porte=empresa_data.porte,
        observacao=observacao
    )
    
    db.add(nova_empresa)
    db.commit()
    db.refresh(nova_empresa)
    
    return {
        "message": "Empresa salva na carteira com sucesso!",
        "empresa_id": nova_empresa.id,
        "empresa": jsonable_encoder(nova_empresa)
    }
