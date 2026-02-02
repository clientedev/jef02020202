from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from backend.database import get_db
from backend.models.mensagens import Mensagem, StatusUsuario, GrupoChat, MembroGrupo, MensagemGrupo, LeituraGrupo
from backend.models import Usuario
from backend.schemas.mensagens import (
    MensagemCriar, MensagemResposta, ConversaResumo, UsuarioSimples, UsuarioStatus,
    MensagemEditar, MensagemReacao, StatusDigitando, GrupoCriar, GrupoEditar,
    GrupoResposta, MensagemGrupoCriar, MensagemGrupoResposta, MembroGrupoSimples,
    BuscaMensagens
)
from backend.auth.security import obter_usuario_atual
from backend.utils.storage import save_upload_file, format_file_size

router = APIRouter(prefix="/api/mensagens", tags=["Mensagens"])

@router.post("/upload")
async def upload_arquivo(
    file: UploadFile = File(...),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    try:
        resultado = await save_upload_file(file)
        resultado["tamanho_formatado"] = format_file_size(resultado["tamanho"])
        return resultado
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao fazer upload: {str(e)}")

def atualizar_status_usuario(db: Session, usuario_id: int, online: bool = True):
    status = db.query(StatusUsuario).filter(StatusUsuario.usuario_id == usuario_id).first()
    if not status:
        status = StatusUsuario(usuario_id=usuario_id, online=online, ultima_atividade=datetime.utcnow())
        db.add(status)
    else:
        status.online = online
        status.ultima_atividade = datetime.utcnow()
    db.commit()
    return status

def get_usuario_status(db: Session, usuario_id: int) -> dict:
    status = db.query(StatusUsuario).filter(StatusUsuario.usuario_id == usuario_id).first()
    if status:
        tempo_limite = datetime.utcnow() - timedelta(minutes=5)
        online = status.ultima_atividade > tempo_limite if status.ultima_atividade else False
        return {
            "online": online,
            "ultima_atividade": status.ultima_atividade,
            "digitando": status.digitando_para is not None and status.digitando_desde and (datetime.utcnow() - status.digitando_desde).seconds < 10
        }
    return {"online": False, "ultima_atividade": None, "digitando": False}

@router.post("/", response_model=MensagemResposta)
def enviar_mensagem(
    mensagem: MensagemCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    atualizar_status_usuario(db, usuario.id)
    
    destinatario = db.query(Usuario).filter(Usuario.id == mensagem.destinatario_id).first()
    if not destinatario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destinatario nao encontrado"
        )
    
    resposta_para = None
    if mensagem.resposta_para_id:
        resposta_para = db.query(Mensagem).filter(Mensagem.id == mensagem.resposta_para_id).first()
        if not resposta_para:
            raise HTTPException(status_code=404, detail="Mensagem de resposta nao encontrada")
    
    nova_mensagem = Mensagem(
        remetente_id=usuario.id,
        destinatario_id=mensagem.destinatario_id,
        conteudo=mensagem.conteudo,
        tipo=mensagem.tipo,
        status="enviada",
        resposta_para_id=mensagem.resposta_para_id,
        anexo_url=mensagem.anexo_url,
        anexo_nome=mensagem.anexo_nome,
        anexo_tamanho=mensagem.anexo_tamanho,
        reacoes={}
    )
    
    db.add(nova_mensagem)
    db.commit()
    db.refresh(nova_mensagem)
    
    mensagem_completa = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario),
        joinedload(Mensagem.resposta_para).joinedload(Mensagem.remetente)
    ).filter(Mensagem.id == nova_mensagem.id).first()
    
    return mensagem_completa

@router.get("/conversas", response_model=List[ConversaResumo])
def listar_conversas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    atualizar_status_usuario(db, usuario.id)
    
    todas_mensagens = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario)
    ).filter(
        and_(
            Mensagem.deletada == False,
            or_(
                Mensagem.remetente_id == usuario.id,
                Mensagem.destinatario_id == usuario.id
            )
        )
    ).order_by(Mensagem.data_envio.desc()).all()
    
    conversas_dict = {}
    
    for msg in todas_mensagens:
        outro_usuario_id = msg.destinatario_id if msg.remetente_id == usuario.id else msg.remetente_id
        
        if outro_usuario_id not in conversas_dict:
            outro_usuario = msg.destinatario if msg.remetente_id == usuario.id else msg.remetente
            
            nao_lidas = db.query(Mensagem).filter(
                and_(
                    Mensagem.remetente_id == outro_usuario_id,
                    Mensagem.destinatario_id == usuario.id,
                    Mensagem.lida == False,
                    Mensagem.deletada == False
                )
            ).count()
            
            status_info = get_usuario_status(db, outro_usuario_id)
            
            usuario_status = UsuarioStatus(
                id=outro_usuario.id,
                nome=outro_usuario.nome,
                email=outro_usuario.email,
                foto_url=outro_usuario.foto_url,
                online=status_info["online"],
                ultima_atividade=status_info["ultima_atividade"],
                digitando=status_info["digitando"]
            )
            
            conversas_dict[outro_usuario_id] = ConversaResumo(
                usuario=usuario_status,
                ultima_mensagem=msg.conteudo if not msg.deletada else "Mensagem apagada",
                ultima_mensagem_tipo=msg.tipo,
                data_ultima_mensagem=msg.data_envio,
                mensagens_nao_lidas=nao_lidas,
                ultima_mensagem_minha=msg.remetente_id == usuario.id
            )
    
    conversas = list(conversas_dict.values())
    return sorted(conversas, key=lambda x: x.data_ultima_mensagem or datetime.min, reverse=True)

@router.get("/usuarios-disponiveis", response_model=List[UsuarioStatus])
def listar_usuarios_disponiveis(
    busca: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    atualizar_status_usuario(db, usuario.id)
    
    query = db.query(Usuario).filter(Usuario.id != usuario.id)
    
    if busca:
        query = query.filter(
            or_(
                Usuario.nome.ilike(f"%{busca}%"),
                Usuario.email.ilike(f"%{busca}%")
            )
        )
    
    usuarios = query.order_by(Usuario.nome).all()
    
    resultado = []
    for u in usuarios:
        status_info = get_usuario_status(db, u.id)
        resultado.append(UsuarioStatus(
            id=u.id,
            nome=u.nome,
            email=u.email,
            foto_url=u.foto_url,
            online=status_info["online"],
            ultima_atividade=status_info["ultima_atividade"],
            digitando=False
        ))
    
    return sorted(resultado, key=lambda x: (not x.online, x.nome.lower()))

@router.get("/conversa/{usuario_id}", response_model=List[MensagemResposta])
def obter_conversa(
    usuario_id: int,
    limite: int = Query(50, ge=1, le=200),
    antes_de: Optional[int] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    atualizar_status_usuario(db, usuario.id)
    
    query = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario),
        joinedload(Mensagem.resposta_para).joinedload(Mensagem.remetente)
    ).filter(
        or_(
            and_(Mensagem.remetente_id == usuario.id, Mensagem.destinatario_id == usuario_id),
            and_(Mensagem.remetente_id == usuario_id, Mensagem.destinatario_id == usuario.id)
        )
    )
    
    if antes_de:
        query = query.filter(Mensagem.id < antes_de)
    
    mensagens = query.order_by(Mensagem.data_envio.desc()).limit(limite).all()
    mensagens = list(reversed(mensagens))
    
    db.query(Mensagem).filter(
        and_(
            Mensagem.remetente_id == usuario_id,
            Mensagem.destinatario_id == usuario.id,
            Mensagem.lida == False
        )
    ).update({
        Mensagem.lida: True, 
        Mensagem.data_leitura: datetime.utcnow(),
        Mensagem.status: "lida"
    })
    db.commit()
    
    return mensagens

@router.put("/{mensagem_id}", response_model=MensagemResposta)
def editar_mensagem(
    mensagem_id: int,
    dados: MensagemEditar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    mensagem = db.query(Mensagem).filter(
        Mensagem.id == mensagem_id,
        Mensagem.remetente_id == usuario.id
    ).first()
    
    if not mensagem:
        raise HTTPException(status_code=404, detail="Mensagem nao encontrada")
    
    if mensagem.deletada:
        raise HTTPException(status_code=400, detail="Mensagem foi apagada")
    
    tempo_limite = datetime.utcnow() - timedelta(hours=24)
    if mensagem.data_envio < tempo_limite:
        raise HTTPException(status_code=400, detail="Mensagem muito antiga para editar")
    
    mensagem.conteudo = dados.conteudo
    mensagem.editada = True
    mensagem.data_edicao = datetime.utcnow()
    db.commit()
    
    mensagem_completa = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario)
    ).filter(Mensagem.id == mensagem_id).first()
    
    return mensagem_completa

@router.delete("/{mensagem_id}")
def deletar_mensagem(
    mensagem_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    mensagem = db.query(Mensagem).filter(
        Mensagem.id == mensagem_id,
        Mensagem.remetente_id == usuario.id
    ).first()
    
    if not mensagem:
        raise HTTPException(status_code=404, detail="Mensagem nao encontrada")
    
    mensagem.deletada = True
    mensagem.conteudo = "Mensagem apagada"
    db.commit()
    
    return {"message": "Mensagem apagada com sucesso"}

@router.post("/{mensagem_id}/reacao")
def adicionar_reacao(
    mensagem_id: int,
    reacao: MensagemReacao,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    mensagem = db.query(Mensagem).filter(Mensagem.id == mensagem_id).first()
    
    if not mensagem:
        raise HTTPException(status_code=404, detail="Mensagem nao encontrada")
    
    reacoes = mensagem.reacoes or {}
    emoji = reacao.emoji
    
    if emoji not in reacoes:
        reacoes[emoji] = []
    
    if usuario.id in reacoes[emoji]:
        reacoes[emoji].remove(usuario.id)
        if len(reacoes[emoji]) == 0:
            del reacoes[emoji]
    else:
        reacoes[emoji].append(usuario.id)
    
    mensagem.reacoes = reacoes
    db.commit()
    
    return {"reacoes": reacoes}

@router.post("/digitando")
def atualizar_digitando(
    status_digitando: StatusDigitando,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    status = db.query(StatusUsuario).filter(StatusUsuario.usuario_id == usuario.id).first()
    
    if not status:
        status = StatusUsuario(
            usuario_id=usuario.id,
            online=True,
            ultima_atividade=datetime.utcnow()
        )
        db.add(status)
    
    if status_digitando.digitando:
        status.digitando_para = status_digitando.destinatario_id
        status.digitando_desde = datetime.utcnow()
    else:
        status.digitando_para = None
        status.digitando_desde = None
    
    status.ultima_atividade = datetime.utcnow()
    db.commit()
    
    return {"status": "ok"}

@router.get("/status/{usuario_id}")
def verificar_status_usuario(
    usuario_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    atualizar_status_usuario(db, usuario.id)
    
    outro_usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not outro_usuario:
        raise HTTPException(status_code=404, detail="Usuario nao encontrado")
    
    status_info = get_usuario_status(db, usuario_id)
    
    status_digitando = db.query(StatusUsuario).filter(
        StatusUsuario.usuario_id == usuario_id,
        StatusUsuario.digitando_para == usuario.id
    ).first()
    
    digitando = False
    if status_digitando and status_digitando.digitando_desde:
        digitando = (datetime.utcnow() - status_digitando.digitando_desde).seconds < 10
    
    return {
        "online": status_info["online"],
        "ultima_atividade": status_info["ultima_atividade"],
        "digitando": digitando
    }

@router.get("/nao-lidas/contagem")
def contar_nao_lidas(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    atualizar_status_usuario(db, usuario.id)
    
    count = db.query(Mensagem).filter(
        and_(
            Mensagem.destinatario_id == usuario.id,
            Mensagem.lida == False,
            Mensagem.deletada == False
        )
    ).count()
    
    return {"count": count}

@router.put("/{mensagem_id}/marcar-lida")
def marcar_como_lida(
    mensagem_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    mensagem = db.query(Mensagem).filter(
        Mensagem.id == mensagem_id,
        Mensagem.destinatario_id == usuario.id
    ).first()
    
    if not mensagem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Mensagem nao encontrada"
        )
    
    mensagem.lida = True
    mensagem.data_leitura = datetime.utcnow()
    mensagem.status = "lida"
    db.commit()
    
    return {"message": "Mensagem marcada como lida"}

@router.post("/buscar", response_model=List[MensagemResposta])
def buscar_mensagens(
    busca: BuscaMensagens,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario)
    ).filter(
        and_(
            Mensagem.deletada == False,
            Mensagem.conteudo.ilike(f"%{busca.termo}%"),
            or_(
                Mensagem.remetente_id == usuario.id,
                Mensagem.destinatario_id == usuario.id
            )
        )
    )
    
    if busca.usuario_id:
        query = query.filter(
            or_(
                and_(Mensagem.remetente_id == usuario.id, Mensagem.destinatario_id == busca.usuario_id),
                and_(Mensagem.remetente_id == busca.usuario_id, Mensagem.destinatario_id == usuario.id)
            )
        )
    
    if busca.data_inicio:
        query = query.filter(Mensagem.data_envio >= busca.data_inicio)
    
    if busca.data_fim:
        query = query.filter(Mensagem.data_envio <= busca.data_fim)
    
    mensagens = query.order_by(Mensagem.data_envio.desc()).limit(100).all()
    
    return mensagens

@router.get("/novas/{usuario_id}")
def verificar_novas_mensagens(
    usuario_id: int,
    ultima_id: int = Query(0),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    atualizar_status_usuario(db, usuario.id)
    
    novas = db.query(Mensagem).options(
        joinedload(Mensagem.remetente),
        joinedload(Mensagem.destinatario),
        joinedload(Mensagem.resposta_para).joinedload(Mensagem.remetente)
    ).filter(
        Mensagem.id > ultima_id,
        or_(
            and_(Mensagem.remetente_id == usuario.id, Mensagem.destinatario_id == usuario_id),
            and_(Mensagem.remetente_id == usuario_id, Mensagem.destinatario_id == usuario.id)
        )
    ).order_by(Mensagem.data_envio.asc()).all()
    
    db.query(Mensagem).filter(
        and_(
            Mensagem.remetente_id == usuario_id,
            Mensagem.destinatario_id == usuario.id,
            Mensagem.lida == False
        )
    ).update({
        Mensagem.lida: True, 
        Mensagem.data_leitura: datetime.utcnow(),
        Mensagem.status: "lida"
    })
    db.commit()
    
    status_info = get_usuario_status(db, usuario_id)
    
    status_digitando = db.query(StatusUsuario).filter(
        StatusUsuario.usuario_id == usuario_id,
        StatusUsuario.digitando_para == usuario.id
    ).first()
    
    digitando = False
    if status_digitando and status_digitando.digitando_desde:
        digitando = (datetime.utcnow() - status_digitando.digitando_desde).seconds < 10
    
    return {
        "mensagens": [MensagemResposta.model_validate(m) for m in novas],
        "status": {
            "online": status_info["online"],
            "ultima_atividade": status_info["ultima_atividade"],
            "digitando": digitando
        }
    }

@router.post("/heartbeat")
def heartbeat(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    atualizar_status_usuario(db, usuario.id, True)
    return {"status": "ok", "timestamp": datetime.utcnow()}
