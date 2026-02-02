from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from backend.database import get_db
from backend.models import AtribuicaoEmpresa, Usuario, Empresa
from backend.schemas.atribuicoes import AtribuicaoEmpresaCreate, AtribuicaoEmpresaResponse, AtribuicaoEmpresaUpdate
from backend.auth.security import obter_usuario_atual
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/atribuicoes", tags=["atribuicoes"])

@router.post("/", response_model=AtribuicaoEmpresaResponse)
def atribuir_empresa(
    atribuicao: AtribuicaoEmpresaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(obter_usuario_atual)
):
    if current_user.tipo != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem atribuir empresas")
    
    consultor = db.query(Usuario).filter(Usuario.id == atribuicao.consultor_id).first()
    if not consultor:
        raise HTTPException(status_code=404, detail="Consultor não encontrado")
    
    empresa = db.query(Empresa).filter(Empresa.id == atribuicao.empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    atribuicao_existente = db.query(AtribuicaoEmpresa).filter(
        AtribuicaoEmpresa.consultor_id == atribuicao.consultor_id,
        AtribuicaoEmpresa.empresa_id == atribuicao.empresa_id,
        AtribuicaoEmpresa.ativa == True
    ).first()
    
    if atribuicao_existente:
        raise HTTPException(status_code=400, detail="Esta empresa já está atribuída a este consultor")
    
    nova_atribuicao = AtribuicaoEmpresa(**atribuicao.dict())
    db.add(nova_atribuicao)
    db.commit()
    
    atribuicao_com_empresa = db.query(AtribuicaoEmpresa).options(
        joinedload(AtribuicaoEmpresa.empresa)
    ).filter(AtribuicaoEmpresa.id == nova_atribuicao.id).first()
    
    return atribuicao_com_empresa

@router.get("/consultor/{consultor_id}", response_model=List[AtribuicaoEmpresaResponse])
def listar_empresas_consultor(
    consultor_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(obter_usuario_atual)
):
    if current_user.tipo != "admin" and current_user.id != consultor_id:
        raise HTTPException(status_code=403, detail="Sem permissão para visualizar estas atribuições")
    
    atribuicoes = db.query(AtribuicaoEmpresa).options(
        joinedload(AtribuicaoEmpresa.empresa)
    ).filter(
        AtribuicaoEmpresa.consultor_id == consultor_id,
        AtribuicaoEmpresa.ativa == True
    ).all()
    
    return atribuicoes

@router.put("/{atribuicao_id}", response_model=AtribuicaoEmpresaResponse)
def atualizar_atribuicao(
    atribuicao_id: int,
    atribuicao_update: AtribuicaoEmpresaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(obter_usuario_atual)
):
    if current_user.tipo != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem atualizar atribuições")
    
    atribuicao = db.query(AtribuicaoEmpresa).filter(AtribuicaoEmpresa.id == atribuicao_id).first()
    if not atribuicao:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada")
    
    if atribuicao_update.ativa is not None:
        atribuicao.ativa = atribuicao_update.ativa
        if not atribuicao_update.ativa:
            atribuicao.data_desativacao = datetime.utcnow()
    
    db.commit()
    
    atribuicao_com_empresa = db.query(AtribuicaoEmpresa).options(
        joinedload(AtribuicaoEmpresa.empresa)
    ).filter(AtribuicaoEmpresa.id == atribuicao_id).first()
    
    return atribuicao_com_empresa

@router.delete("/{atribuicao_id}")
def remover_atribuicao(
    atribuicao_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(obter_usuario_atual)
):
    if current_user.tipo != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem remover atribuições")
    
    atribuicao = db.query(AtribuicaoEmpresa).filter(AtribuicaoEmpresa.id == atribuicao_id).first()
    if not atribuicao:
        raise HTTPException(status_code=404, detail="Atribuição não encontrada")
    
    atribuicao.ativa = False
    atribuicao.data_desativacao = datetime.utcnow()
    db.commit()
    
    return {"message": "Atribuição removida com sucesso"}

@router.post("/lote")
def atribuir_empresas_lote(
    consultor_id: int,
    empresa_ids: List[int],
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(obter_usuario_atual)
):
    if current_user.tipo != "admin":
        raise HTTPException(status_code=403, detail="Apenas administradores podem atribuir empresas")
    
    consultor = db.query(Usuario).filter(Usuario.id == consultor_id).first()
    if not consultor:
        raise HTTPException(status_code=404, detail="Consultor não encontrado")
    
    atribuicoes_criadas = []
    for empresa_id in empresa_ids:
        empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
        if not empresa:
            continue
        
        atribuicao_existente = db.query(AtribuicaoEmpresa).filter(
            AtribuicaoEmpresa.consultor_id == consultor_id,
            AtribuicaoEmpresa.empresa_id == empresa_id,
            AtribuicaoEmpresa.ativa == True
        ).first()
        
        if not atribuicao_existente:
            nova_atribuicao = AtribuicaoEmpresa(
                consultor_id=consultor_id,
                empresa_id=empresa_id,
                ativa=True
            )
            db.add(nova_atribuicao)
            atribuicoes_criadas.append(nova_atribuicao)
    
    db.commit()
    
    return {"message": f"{len(atribuicoes_criadas)} empresas atribuídas com sucesso"}
