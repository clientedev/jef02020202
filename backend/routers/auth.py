from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Usuario, TipoUsuario
from backend.schemas.usuarios import UsuarioCriar, UsuarioLogin, Token, UsuarioResposta
from backend.auth.security import verificar_senha, obter_hash_senha, criar_token_acesso, obter_usuario_admin

router = APIRouter(prefix="/api/auth", tags=["Autenticação"])

@router.post("/registro", response_model=UsuarioResposta)
def registrar_usuario(
    usuario: UsuarioCriar,
    db: Session = Depends(get_db),
    admin: Usuario = Depends(obter_usuario_admin)
):
    db_usuario = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    if db_usuario:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já cadastrado"
        )
    
    senha_hash = obter_hash_senha(usuario.senha)
    novo_usuario = Usuario(
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=senha_hash,
        tipo=usuario.tipo if usuario.tipo else TipoUsuario.consultor
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

@router.post("/login", response_model=Token)
def login(credenciais: UsuarioLogin, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == credenciais.email).first()
    if not usuario or not verificar_senha(credenciais.senha, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = criar_token_acesso(data={"sub": usuario.email})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": usuario
    }
