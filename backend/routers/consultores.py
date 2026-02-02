from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List
from backend.database import get_db
from backend.models import Usuario, Prospeccao
from backend.schemas.usuarios import ConsultorPerfil, UsuarioAtualizar, UsuarioCriar
from backend.schemas.prospeccoes import ProspeccaoResposta
from backend.auth.security import obter_usuario_atual, obter_usuario_admin, obter_hash_senha
from backend.models.usuarios import TipoUsuario

router = APIRouter(prefix="/api/consultores", tags=["Consultores"])

@router.get("/usuario/{usuario_id}")
def obter_usuario_generico(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    return {
        "perfil": {
            "id": user.id,
            "nome": user.nome,
            "email": user.email,
            "tipo": user.tipo.value,
            "foto_url": user.foto_url
        }
    }

@router.get("/")
def listar_consultores(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Items por página"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(Usuario).filter(Usuario.tipo == TipoUsuario.consultor)
    
    total_count = query.count()
    total_pages = (total_count + page_size - 1) // page_size
    
    skip = (page - 1) * page_size
    consultores = query.offset(skip).limit(page_size).all()
    
    items_safe = [
        {
            "id": c.id,
            "nome": c.nome,
            "email": c.email,
            "tipo": c.tipo.value,
            "data_nascimento": c.data_nascimento,
            "modelo_carro": c.modelo_carro,
            "placa_carro": c.placa_carro,
            "informacoes_basicas": c.informacoes_basicas,
            "foto_url": c.foto_url
        }
        for c in consultores
    ]
    
    return {
        "items": items_safe,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/{consultor_id}")
def obter_consultor_perfil(
    consultor_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    consultor = db.query(Usuario).filter(
        Usuario.id == consultor_id
    ).first()
    
    if not consultor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    prospeccoes = db.query(Prospeccao).options(
        joinedload(Prospeccao.empresa),
        joinedload(Prospeccao.consultor)
    ).filter(
        Prospeccao.consultor_id == consultor_id
    ).order_by(Prospeccao.data_criacao.desc()).all()
    
    total_prospeccoes = len(prospeccoes)
    
    prospeccoes_safe = [ProspeccaoResposta.model_validate(p) for p in prospeccoes]
    
    from backend.models import AtribuicaoEmpresa
    empresas_atribuidas = db.query(AtribuicaoEmpresa).filter(
        AtribuicaoEmpresa.consultor_id == consultor_id
    ).count()
    
    return {
        "perfil": {
            "id": consultor.id,
            "nome": consultor.nome,
            "email": consultor.email,
            "telefone": consultor.telefone,
            "data_nascimento": consultor.data_nascimento,
            "modelo_carro": consultor.modelo_carro,
            "placa_carro": consultor.placa_carro,
            "informacoes_basicas": consultor.informacoes_basicas,
            "foto_url": consultor.foto_url
        },
        "estatisticas": {
            "total_prospeccoes": total_prospeccoes,
            "empresas_atribuidas": empresas_atribuidas
        },
        "prospeccoes": prospeccoes_safe
    }

@router.put("/perfil/atualizar")
def atualizar_meu_perfil(
    dados: UsuarioAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    consultor = db.query(Usuario).filter(Usuario.id == usuario.id).first()
    
    if not consultor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado"
        )
    
    for key, value in dados.model_dump(exclude_unset=True).items():
        if key == "senha" and value:
            setattr(consultor, "senha_hash", obter_hash_senha(value))
        elif key == "tipo":
            continue
        else:
            setattr(consultor, key, value)
    
    db.commit()
    db.refresh(consultor)
    
    return {
        "id": consultor.id,
        "nome": consultor.nome,
        "email": consultor.email,
        "tipo": consultor.tipo.value,
        "telefone": consultor.telefone,
        "data_nascimento": consultor.data_nascimento,
        "modelo_carro": consultor.modelo_carro,
        "placa_carro": consultor.placa_carro,
        "informacoes_basicas": consultor.informacoes_basicas,
        "foto_url": consultor.foto_url
    }

@router.put("/{consultor_id}")
def atualizar_consultor(
    consultor_id: int,
    dados: UsuarioAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_admin)
):
    consultor = db.query(Usuario).filter(Usuario.id == consultor_id).first()
    
    if not consultor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultor não encontrado"
        )
    
    for key, value in dados.model_dump(exclude_unset=True).items():
        if key == "senha" and value:
            setattr(consultor, "senha_hash", obter_hash_senha(value))
        else:
            setattr(consultor, key, value)
    
    db.commit()
    db.refresh(consultor)
    
    return {
        "id": consultor.id,
        "nome": consultor.nome,
        "email": consultor.email,
        "tipo": consultor.tipo.value,
        "telefone": consultor.telefone,
        "data_nascimento": consultor.data_nascimento,
        "modelo_carro": consultor.modelo_carro,
        "placa_carro": consultor.placa_carro,
        "informacoes_basicas": consultor.informacoes_basicas,
        "foto_url": consultor.foto_url
    }

@router.post("/")
def criar_consultor(
    dados: UsuarioCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_admin)
):
    usuario_existente = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    novo_consultor = Usuario(
        nome=dados.nome,
        email=dados.email,
        senha_hash=obter_hash_senha(dados.senha),
        tipo=TipoUsuario.consultor
    )
    
    db.add(novo_consultor)
    db.commit()
    db.refresh(novo_consultor)
    
    return {
        "id": novo_consultor.id,
        "nome": novo_consultor.nome,
        "email": novo_consultor.email,
        "tipo": novo_consultor.tipo.value,
        "message": "Consultor criado com sucesso"
    }

@router.delete("/{consultor_id}")
def excluir_consultor(
    consultor_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_admin)
):
    consultor = db.query(Usuario).filter(
        Usuario.id == consultor_id,
        Usuario.tipo == TipoUsuario.consultor
    ).first()
    
    if not consultor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultor não encontrado"
        )
    
    from backend.models import AtribuicaoEmpresa
    db.query(AtribuicaoEmpresa).filter(
        AtribuicaoEmpresa.consultor_id == consultor_id
    ).delete()
    
    db.query(Prospeccao).filter(
        Prospeccao.consultor_id == consultor_id
    ).delete()
    
    db.delete(consultor)
    db.commit()
    
    return {"message": "Consultor excluído com sucesso"}
