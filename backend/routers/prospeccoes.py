from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
from backend.database import get_db
from backend.models import Prospeccao, Usuario, Empresa, Agendamento, ProspeccaoHistorico
from backend.models.agendamentos import StatusAgendamento
from backend.schemas.prospeccoes import ProspeccaoCriar, ProspeccaoResposta, ProspeccaoAtualizar, ProspeccaoComHistorico, ProspeccaoHistoricoResposta
from backend.auth.security import obter_usuario_atual, obter_usuario_admin
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib import colors
from io import BytesIO
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/prospeccoes", tags=["Prospecções"])

CAMPOS_LABELS = {
    'empresa_id': 'Empresa',
    'consultor_id': 'Consultor',
    'data_ligacao': 'Data da Ligação',
    'hora_ligacao': 'Hora da Ligação',
    'resultado': 'Resultado',
    'observacoes': 'Observações',
    'porte': 'Porte',
    'lr': 'LR',
    'id_externo': 'ID Externo',
    'cfr': 'CFR',
    'tipo_producao': 'Tipo de Produção',
    'data_prospeccao': 'Data da Prospecção',
    'follow_up': 'Follow-up',
    'nome_contato': 'Nome do Contato',
    'cargo': 'Cargo',
    'celular': 'Celular',
    'telefone': 'Telefone',
    'telefone_contato': 'Telefone do Contato',
    'email_contato': 'E-mail do Contato',
    'cargo_contato': 'Cargo do Contato',
    'cnpj': 'CNPJ',
    'status_prospeccao': 'Status da Prospecção',
    'responsavel': 'Responsável',
    'opcoes': 'Opções',
    'retorno': 'Retorno',
    'observacoes_prospeccao': 'Observações da Prospecção',
    'interesse_treinamento': 'Interesse em Treinamento',
    'interesse_consultoria': 'Interesse em Consultoria',
    'interesse_certificacao': 'Interesse em Certificação',
    'interesse_eventos': 'Interesse em Eventos',
    'interesse_produtos': 'Interesse em Produtos',
    'interesse_seguranca': 'Interesse em Segurança',
    'interesse_meio_ambiente': 'Interesse em Meio Ambiente',
    'outros_interesses': 'Outros Interesses',
    'potencial_negocio': 'Potencial de Negócio',
    'status_follow_up': 'Status de Follow-up',
    'proxima_prospeccao_data': 'Data da Próxima Prospecção'
}

def registrar_historico(db: Session, prospeccao_id: int, usuario_id: int, tipo: str, campo: str = None, valor_anterior: str = None, valor_novo: str = None, descricao: str = None):
    """Registra uma alteração no histórico da prospecção"""
    historico = ProspeccaoHistorico(
        prospeccao_id=prospeccao_id,
        usuario_id=usuario_id,
        tipo_alteracao=tipo,
        campo_alterado=campo,
        valor_anterior=str(valor_anterior) if valor_anterior is not None else None,
        valor_novo=str(valor_novo) if valor_novo is not None else None,
        descricao=descricao
    )
    db.add(historico)

@router.post("/", response_model=ProspeccaoResposta)
def criar_prospeccao(
    prospeccao: ProspeccaoCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    empresa = db.query(Empresa).filter(Empresa.id == prospeccao.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    consultor = db.query(Usuario).filter(Usuario.id == prospeccao.consultor_id).first()
    if not consultor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultor não encontrado"
        )
    
    if usuario.tipo != "admin" and usuario.id != prospeccao.consultor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só pode criar prospecções para si mesmo"
        )
    
    nova_prospeccao = Prospeccao(**prospeccao.model_dump())
    db.add(nova_prospeccao)
    db.flush()
    
    registrar_historico(
        db=db,
        prospeccao_id=nova_prospeccao.id,
        usuario_id=usuario.id,
        tipo="criacao",
        descricao=f"Prospecção criada para empresa {empresa.empresa}"
    )
    
    db.commit()
    db.refresh(nova_prospeccao)
    return nova_prospeccao

@router.get("/", response_model=List[ProspeccaoResposta])
def listar_prospeccoes(
    skip: int = 0,
    limit: int = 100,
    empresa_id: int = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(Prospeccao).options(
        joinedload(Prospeccao.empresa),
        joinedload(Prospeccao.consultor)
    )
    
    if usuario.tipo != "admin":
        query = query.filter(Prospeccao.consultor_id == usuario.id)
    
    if empresa_id:
        query = query.filter(Prospeccao.empresa_id == empresa_id)
    
    prospeccoes = query.order_by(Prospeccao.data_criacao.desc()).offset(skip).limit(limit).all()
    return prospeccoes

@router.get("/{prospeccao_id}", response_model=ProspeccaoResposta)
def obter_prospeccao(
    prospeccao_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    prospeccao = db.query(Prospeccao).options(
        joinedload(Prospeccao.empresa),
        joinedload(Prospeccao.consultor)
    ).filter(Prospeccao.id == prospeccao_id).first()
    if not prospeccao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospecção não encontrada"
        )
    
    if usuario.tipo != "admin" and prospeccao.consultor_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar esta prospecção"
        )
    
    return prospeccao

@router.get("/{prospeccao_id}/historico", response_model=List[ProspeccaoHistoricoResposta])
def obter_historico_prospeccao(
    prospeccao_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Retorna o histórico de alterações de uma prospecção"""
    prospeccao = db.query(Prospeccao).filter(Prospeccao.id == prospeccao_id).first()
    if not prospeccao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospecção não encontrada"
        )
    
    if usuario.tipo != "admin" and prospeccao.consultor_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar esta prospecção"
        )
    
    historico = db.query(ProspeccaoHistorico).options(
        joinedload(ProspeccaoHistorico.usuario)
    ).filter(
        ProspeccaoHistorico.prospeccao_id == prospeccao_id
    ).order_by(ProspeccaoHistorico.data_alteracao.desc()).all()
    
    return historico

@router.get("/{prospeccao_id}/completo", response_model=ProspeccaoComHistorico)
def obter_prospeccao_com_historico(
    prospeccao_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Retorna a prospecção com todo seu histórico de alterações"""
    prospeccao = db.query(Prospeccao).options(
        joinedload(Prospeccao.empresa),
        joinedload(Prospeccao.consultor),
        joinedload(Prospeccao.historico).joinedload(ProspeccaoHistorico.usuario)
    ).filter(Prospeccao.id == prospeccao_id).first()
    
    if not prospeccao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospecção não encontrada"
        )
    
    if usuario.tipo != "admin" and prospeccao.consultor_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar esta prospecção"
        )
    
    return prospeccao

@router.put("/{prospeccao_id}", response_model=ProspeccaoResposta)
def atualizar_prospeccao(
    prospeccao_id: int,
    dados: ProspeccaoAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    """Atualiza uma prospecção existente e registra as alterações no histórico"""
    prospeccao = db.query(Prospeccao).options(
        joinedload(Prospeccao.empresa),
        joinedload(Prospeccao.consultor)
    ).filter(Prospeccao.id == prospeccao_id).first()
    
    if not prospeccao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospecção não encontrada"
        )
    
    if usuario.tipo != "admin" and prospeccao.consultor_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para editar esta prospecção"
        )
    
    dados_atualizacao = dados.model_dump(exclude_unset=True)
    campos_alterados = []
    
    for campo, valor_novo in dados_atualizacao.items():
        valor_anterior = getattr(prospeccao, campo)
        
        valor_ant_str = str(valor_anterior) if valor_anterior is not None else ''
        valor_novo_str = str(valor_novo) if valor_novo is not None else ''
        
        if valor_ant_str != valor_novo_str:
            label_campo = CAMPOS_LABELS.get(campo, campo)
            
            if isinstance(valor_anterior, bool):
                valor_ant_display = 'Sim' if valor_anterior else 'Não'
            else:
                valor_ant_display = valor_anterior
                
            if isinstance(valor_novo, bool):
                valor_novo_display = 'Sim' if valor_novo else 'Não'
            else:
                valor_novo_display = valor_novo
            
            registrar_historico(
                db=db,
                prospeccao_id=prospeccao_id,
                usuario_id=usuario.id,
                tipo="edicao",
                campo=label_campo,
                valor_anterior=valor_ant_display,
                valor_novo=valor_novo_display,
                descricao=f"Campo '{label_campo}' alterado"
            )
            campos_alterados.append(label_campo)
            
            setattr(prospeccao, campo, valor_novo)
    
    if campos_alterados:
        db.commit()
        db.refresh(prospeccao)
        db.refresh(prospeccao.empresa)
        db.refresh(prospeccao.consultor)
    
    return prospeccao

@router.post("/com-agendamento")
def criar_prospeccao_com_agendamento(
    prospeccao: ProspeccaoCriar,
    agendar_proxima: bool = False,
    data_proxima_ligacao: str = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    empresa = db.query(Empresa).filter(Empresa.id == prospeccao.empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    consultor = db.query(Usuario).filter(Usuario.id == prospeccao.consultor_id).first()
    if not consultor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Consultor não encontrado"
        )
    
    if usuario.tipo != "admin" and usuario.id != prospeccao.consultor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você só pode criar prospecções para si mesmo"
        )
    
    nova_prospeccao = Prospeccao(**prospeccao.model_dump())
    db.add(nova_prospeccao)
    db.flush()
    
    registrar_historico(
        db=db,
        prospeccao_id=nova_prospeccao.id,
        usuario_id=usuario.id,
        tipo="criacao",
        descricao=f"Prospecção criada para empresa {empresa.empresa}"
    )
    
    if agendar_proxima and data_proxima_ligacao:
        try:
            data_proxima = datetime.strptime(data_proxima_ligacao, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data inválida. Use o formato YYYY-MM-DD"
            )
        
        novo_agendamento = Agendamento(
            prospeccao_id=nova_prospeccao.id,
            data_agendada=data_proxima,
            status=StatusAgendamento.pendente,
            observacoes=f"Retorno da prospecção anterior - {prospeccao.resultado}"
        )
        db.add(novo_agendamento)
        
        registrar_historico(
            db=db,
            prospeccao_id=nova_prospeccao.id,
            usuario_id=usuario.id,
            tipo="agendamento",
            descricao=f"Agendamento criado para {data_proxima_ligacao}"
        )
    
    db.commit()
    db.refresh(nova_prospeccao)
    
    agendamento_realmente_criado = bool(agendar_proxima and data_proxima_ligacao)
    
    return {
        "prospeccao": nova_prospeccao,
        "agendamento_criado": agendamento_realmente_criado,
        "message": "Prospecção criada com sucesso" + (" e próxima ligação agendada" if agendamento_realmente_criado else "")
    }

@router.get("/export-pdf/{prospeccao_id}")
def exportar_prospeccao_pdf(
    prospeccao_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    prospeccao = db.query(Prospeccao).filter(Prospeccao.id == prospeccao_id).first()
    if not prospeccao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prospecção não encontrada"
        )
    
    if usuario.tipo != "admin" and prospeccao.consultor_id != usuario.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar esta prospecção"
        )
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    elements.append(Paragraph(f"Relatório de Prospecção", styles['Title']))
    elements.append(Paragraph(f"Código: {prospeccao.codigo}", styles['Heading2']))
    elements.append(Spacer(1, 12))
    
    empresa_info = [
        ['Empresa:', prospeccao.empresa.empresa],
        ['CNPJ:', prospeccao.empresa.cnpj or 'N/A'],
        ['Município:', prospeccao.empresa.municipio or 'N/A'],
        ['Estado:', prospeccao.empresa.estado or 'N/A'],
    ]
    
    empresa_table = Table(empresa_info, colWidths=[150, 350])
    empresa_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.grey),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(empresa_table)
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("Detalhes da Prospecção", styles['Heading2']))
    elements.append(Spacer(1, 6))
    
    prospeccao_info = [
        ['Consultor:', prospeccao.consultor.nome],
        ['Data da Ligação:', str(prospeccao.data_ligacao) if prospeccao.data_ligacao else 'N/A'],
        ['Hora:', str(prospeccao.hora_ligacao) if prospeccao.hora_ligacao else 'N/A'],
        ['Resultado:', prospeccao.resultado or 'N/A'],
    ]
    
    prospeccao_table = Table(prospeccao_info, colWidths=[150, 350])
    prospeccao_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.grey),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(prospeccao_table)
    elements.append(Spacer(1, 12))
    
    elements.append(Paragraph("Interesses do Cliente", styles['Heading2']))
    elements.append(Spacer(1, 6))
    
    interesses = [
        ['Treinamento:', 'Sim' if prospeccao.interesse_treinamento else 'Não'],
        ['Consultoria:', 'Sim' if prospeccao.interesse_consultoria else 'Não'],
        ['Certificação:', 'Sim' if prospeccao.interesse_certificacao else 'Não'],
        ['Eventos:', 'Sim' if prospeccao.interesse_eventos else 'Não'],
        ['Produtos:', 'Sim' if prospeccao.interesse_produtos else 'Não'],
    ]
    
    interesse_table = Table(interesses, colWidths=[150, 350])
    interesse_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(interesse_table)
    elements.append(Spacer(1, 12))
    
    if prospeccao.outros_interesses:
        elements.append(Paragraph("Outros Interesses:", styles['Heading3']))
        elements.append(Paragraph(prospeccao.outros_interesses, styles['Normal']))
        elements.append(Spacer(1, 12))
    
    if prospeccao.observacoes:
        elements.append(Paragraph("Observações:", styles['Heading3']))
        elements.append(Paragraph(prospeccao.observacoes, styles['Normal']))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=prospeccao_{prospeccao.codigo}.pdf"
        }
    )
