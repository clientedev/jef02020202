from sqlalchemy.orm import Session
from backend.models.notificacoes import Notificacao, TipoNotificacao
from backend.models import Usuario

def criar_notificacao_sistema(
    db: Session,
    tipo: TipoNotificacao,
    titulo: str,
    mensagem: str,
    usuario_origem_id: int,
    link: str = None,
    notificar_admins: bool = True
):
    """
    Cria uma notificação no sistema.
    Se notificar_admins=True, cria notificações para todos os admins.
    Caso contrário, cria uma notificação geral (destino None).
    """
    if notificar_admins:
        admins = db.query(Usuario).filter(Usuario.tipo == "admin").all()
        for admin in admins:
            notificacao = Notificacao(
                tipo=tipo,
                titulo=titulo,
                mensagem=mensagem,
                usuario_origem_id=usuario_origem_id,
                usuario_destino_id=admin.id,
                link=link
            )
            db.add(notificacao)
    else:
        notificacao = Notificacao(
            tipo=tipo,
            titulo=titulo,
            mensagem=mensagem,
            usuario_origem_id=usuario_origem_id,
            usuario_destino_id=None,
            link=link
        )
        db.add(notificacao)
    
    db.commit()
