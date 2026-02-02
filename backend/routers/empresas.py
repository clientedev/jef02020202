from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.database import get_db
from backend.models import Empresa, Usuario
from backend.schemas.empresas import EmpresaCriar, EmpresaResposta, EmpresaAtualizar
from backend.auth.security import obter_usuario_atual, obter_usuario_admin
import openpyxl
from io import BytesIO
from datetime import datetime

router = APIRouter(prefix="/api/empresas", tags=["Empresas"])

@router.post("/", response_model=EmpresaResposta)
def criar_empresa(
    empresa: EmpresaCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_admin)
):
    if empresa.cnpj:
        db_empresa = db.query(Empresa).filter(Empresa.cnpj == empresa.cnpj).first()
        if db_empresa:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Empresa com este CNPJ já cadastrada"
            )
    
    nova_empresa = Empresa(**empresa.model_dump())
    db.add(nova_empresa)
    db.commit()
    db.refresh(nova_empresa)
    return nova_empresa

@router.get("/")
def listar_empresas(
    page: int = Query(1, ge=1, description="Número da página"),
    page_size: int = Query(20, ge=1, le=100, description="Items por página"),
    nome: Optional[str] = None,
    cnpj: Optional[str] = None,
    municipio: Optional[str] = None,
    er: Optional[str] = None,
    carteira: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    query = db.query(Empresa)
    
    if nome:
        query = query.filter(Empresa.empresa.ilike(f"%{nome}%"))
    if cnpj:
        query = query.filter(Empresa.cnpj.ilike(f"%{cnpj}%"))
    if municipio:
        query = query.filter(Empresa.municipio.ilike(f"%{municipio}%"))
    if er:
        query = query.filter(Empresa.er == er)
    if carteira:
        query = query.filter(Empresa.carteira == carteira)
    
    total_count = query.count()
    total_pages = (total_count + page_size - 1) // page_size
    
    skip = (page - 1) * page_size
    empresas = query.offset(skip).limit(page_size).all()
    
    from backend.schemas.empresas import EmpresaResposta
    items_safe = [EmpresaResposta.model_validate(e) for e in empresas]
    
    return {
        "items": items_safe,
        "total_count": total_count,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }

@router.get("/{empresa_id}", response_model=EmpresaResposta)
def obter_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    return empresa

@router.get("/{empresa_id}/ultimo-contato")
def obter_ultimo_contato(
    empresa_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    from backend.models.prospeccoes import Prospeccao
    
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    nome = empresa.nome_contato
    cargo = empresa.cargo_contato
    telefone = empresa.telefone_contato
    email = empresa.email_contato
    
    if not any([nome, cargo, telefone, email]):
        ultima_prospeccao = db.query(Prospeccao).filter(
            Prospeccao.empresa_id == empresa_id
        ).order_by(Prospeccao.data_criacao.desc()).first()
        
        if ultima_prospeccao:
            nome = nome or ultima_prospeccao.nome_contato
            cargo = cargo or ultima_prospeccao.cargo_contato or ultima_prospeccao.cargo
            telefone = telefone or ultima_prospeccao.telefone_contato or ultima_prospeccao.telefone or ultima_prospeccao.celular
            email = email or ultima_prospeccao.email_contato
    
    tem_contato = bool(nome or cargo or telefone or email)
    
    return {
        "tem_contato": tem_contato,
        "nome_contato": nome,
        "cargo_contato": cargo,
        "telefone_contato": telefone,
        "email_contato": email
    }

@router.put("/{empresa_id}", response_model=EmpresaResposta)
def atualizar_empresa(
    empresa_id: int,
    empresa_atualizada: EmpresaAtualizar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_admin)
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    for key, value in empresa_atualizada.model_dump(exclude_unset=True).items():
        setattr(empresa, key, value)
    
    db.commit()
    db.refresh(empresa)
    return empresa

@router.delete("/{empresa_id}")
def deletar_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_admin)
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa não encontrada"
        )
    
    db.delete(empresa)
    db.commit()
    return {"detail": "Empresa deletada com sucesso"}

@router.post("/upload-excel")
async def upload_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_admin)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo deve ser Excel (.xlsx ou .xls)"
        )
    
    try:
        contents = await file.read()
        wb = openpyxl.load_workbook(BytesIO(contents))
        ws = wb.active
        
        empresas_criadas = 0
        empresas_atualizadas = 0
        empresas_ignoradas = 0
        cnpjs_processados = set()
        
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row[0]:
                continue
            
            empresa_nome = str(row[0]) if row[0] else None
            cnpj = str(row[1]) if row[1] else None
            
            if not cnpj or cnpj in cnpjs_processados:
                empresas_ignoradas += 1
                continue
                
            cnpjs_processados.add(cnpj)
            
            sigla = str(row[3]) if len(row) > 3 and row[3] else None
            porte = str(row[4]) if len(row) > 4 and row[4] else None
            er = str(row[5]) if len(row) > 5 and row[5] else None
            carteira = str(row[6]) if len(row) > 6 and row[6] else None
            endereco = str(row[7]) if len(row) > 7 and row[7] else None
            bairro = str(row[8]) if len(row) > 8 and row[8] else None
            municipio = str(row[10]) if len(row) > 10 and row[10] else None
            estado = str(row[11]) if len(row) > 11 and row[11] else None
            pais = str(row[12]) if len(row) > 12 and row[12] else None
            area = str(row[13]) if len(row) > 13 and row[13] else None
            cnae_principal = str(row[14]) if len(row) > 14 and row[14] else None
            descricao_cnae = str(row[15]) if len(row) > 15 and row[15] else None
            tipo_empresa = str(row[16]) if len(row) > 16 and row[16] else None
            
            try:
                numero_funcionarios = int(row[18]) if len(row) > 18 and row[18] and isinstance(row[18], (int, float)) else None
            except (ValueError, TypeError):
                numero_funcionarios = None
                
            observacao = str(row[19]) if len(row) > 19 and row[19] else None
            
            empresa_existente = db.query(Empresa).filter(Empresa.cnpj == cnpj).first()
            
            if empresa_existente:
                empresas_ignoradas += 1
            else:
                nova_empresa = Empresa(
                    empresa=empresa_nome,
                    cnpj=cnpj,
                    sigla=sigla,
                    porte=porte,
                    er=er,
                    carteira=carteira,
                    endereco=endereco,
                    bairro=bairro,
                    municipio=municipio,
                    estado=estado,
                    pais=pais,
                    area=area,
                    cnae_principal=cnae_principal,
                    descricao_cnae=descricao_cnae,
                    tipo_empresa=tipo_empresa,
                    numero_funcionarios=numero_funcionarios,
                    observacao=observacao
                )
                db.add(nova_empresa)
                empresas_criadas += 1
        
        db.commit()
        
        return {
            "message": "Upload concluído com sucesso",
            "empresas_criadas": empresas_criadas,
            "empresas_ignoradas": empresas_ignoradas,
            "total_processadas": empresas_criadas + empresas_ignoradas
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao processar arquivo: {str(e)}"
        )
