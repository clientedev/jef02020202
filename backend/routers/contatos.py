from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import io
import csv
from backend.database import get_db
from backend.models import Contato, Usuario, Empresa
from backend.schemas.crm import ContatoCriar, ContatoResposta
from backend.auth.security import obter_usuario_atual, obter_usuario_admin

router = APIRouter(prefix="/api/contatos", tags=["Contatos"])

@router.post("/", response_model=ContatoResposta)
def criar_contato(
    contato: ContatoCriar,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    novo_contato = Contato(**contato.model_dump())
    db.add(novo_contato)
    db.commit()
    db.refresh(novo_contato)
    return novo_contato

@router.get("/", response_model=List[dict])
def listar_todos_contatos(
    nome: Optional[str] = None,
    cargo: Optional[str] = None,
    empresa: Optional[str] = None,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    from backend.models.empresas import Empresa
    query = db.query(Contato).join(Empresa)
    
    if nome:
        query = query.filter(Contato.nome.ilike(f"%{nome}%"))
    if cargo:
        query = query.filter(Contato.cargo.ilike(f"%{cargo}%"))
    if empresa:
        query = query.filter(Empresa.empresa.ilike(f"%{empresa}%"))
        
    contatos = query.all()
    
    return [
        {
            "id": c.id,
            "nome": c.nome,
            "email": c.email,
            "celular": c.celular,
            "celular2": c.celular2,
            "telefone_fixo": c.telefone_fixo,
            "cargo": c.cargo,
            "ponto_focal": c.ponto_focal,
            "proprietario_socio": c.proprietario_socio,
            "emails_voltaram": c.emails_voltaram,
            "observacoes": c.observacoes,
            "empresa_id": c.empresa_id,
            "empresa_nome": c.empresa.empresa
        } for c in contatos
    ]

@router.get("/empresa/{empresa_id}", response_model=List[ContatoResposta])
def listar_contatos_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    return db.query(Contato).filter(Contato.empresa_id == empresa_id).all()

@router.delete("/{contato_id}")
def deletar_contato(
    contato_id: int,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    contato = db.query(Contato).filter(Contato.id == contato_id).first()
    if not contato:
        raise HTTPException(status_code=404, detail="Contato não encontrado")
    
    db.delete(contato)
    db.commit()
    return {"message": "Contato removido com sucesso"}

@router.post("/importar")
async def importar_contatos(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(obter_usuario_atual)
):
    content = await file.read()
    filename = file.filename.lower()
    
    contacts_data = []
    
    if filename.endswith('.csv'):
        # Processar CSV
        try:
            decoded_content = content.decode('utf-8-sig') # Handle BOM if present
            reader = csv.DictReader(io.StringIO(decoded_content), delimiter=';') # Trying semicolon first as it's common in BR
            
            # If header is not found with semicolon, try comma
            if len(reader.fieldnames) <= 1:
                reader = csv.DictReader(io.StringIO(decoded_content), delimiter=',')
                
            for row in reader:
                contacts_data.append(row)
        except Exception as e:
            try:
                # Try latin-1 if utf-8 fails
                decoded_content = content.decode('latin-1')
                reader = csv.DictReader(io.StringIO(decoded_content), delimiter=';')
                if len(reader.fieldnames) <= 1:
                    reader = csv.DictReader(io.StringIO(decoded_content), delimiter=',')
                for row in reader:
                    contacts_data.append(row)
            except Exception as e2:
                raise HTTPException(status_code=400, detail=f"Erro ao ler CSV: {str(e2)}")

    elif filename.endswith('.xlsx'):
        # Processar Excel (requer pandas e openpyxl)
        try:
            import pandas as pd
            df = pd.read_excel(io.BytesIO(content))
            contacts_data = df.to_dict('records')
        except ImportError:
            raise HTTPException(status_code=500, detail="Servidor não possui bibliotecas para ler Excel (pandas/openpyxl)")
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Erro ao ler Excel: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="Formato de arquivo não suportado. Use .csv ou .xlsx")

    importados = 0
    erros = []
    
    # Normalização de chaves para case-insensitive
    def get_val(row, *possible_keys):
        for k in row.keys():
            k_clean = str(k).strip().upper()
            for pk in possible_keys:
                if k_clean == pk:
                    return str(row[k]).strip() if row[k] is not None and str(row[k]).strip() != 'nan' else None
        return None

    def is_true(val):
        if not val: return False
        val = str(val).strip().lower()
        return val in ['sim', 'yes', 'true', '1', 's', 'x']

    for row in contacts_data:
        empresa_nome = get_val(row, 'EMPRESA', 'NOME DA EMPRESA')
        contato_nome = get_val(row, 'CONTATO', 'NOME', 'NOME DO CONTATO')
        
        if not empresa_nome or not contato_nome:
            continue
            
        cnpj = get_val(row, 'CNPJ')
        if cnpj:
            cnpj = cnpj[:50]
        
        # Buscar ou criar empresa
        empresa_nome_search = empresa_nome.strip()
        empresa = db.query(Empresa).filter(Empresa.empresa.ilike(empresa_nome_search)).first()
        if not empresa and cnpj:
            empresa = db.query(Empresa).filter(Empresa.cnpj == cnpj).first()
            
        if not empresa:
            empresa = Empresa(empresa=empresa_nome_search, cnpj=cnpj)
            db.add(empresa)
            db.flush()
            
        # Criar contato
        novo_contato = Contato(
            empresa_id=empresa.id,
            nome=contato_nome,
            email=get_val(row, 'EMAIL', 'E-MAIL'),
            celular=(get_val(row, 'CELULAR') or "")[:50],
            celular2=(get_val(row, 'CELULAR2') or "")[:50],
            telefone_fixo=(get_val(row, 'TELEFONE FIXO', 'TELEFONE') or "")[:50],
            cargo=get_val(row, 'CARGO'),
            ponto_focal=is_true(get_val(row, 'PONTO FOCAL')),
            proprietario_socio=is_true(get_val(row, 'PROPRIETÁRIO / SÓCIO', 'PROPRIETARIO', 'SOCIO')),
            emails_voltaram=is_true(get_val(row, 'E-MAILS VOLTARAM')),
            observacoes=get_val(row, 'OBS', 'OBSERVAÇÕES', 'NOTAS')
        )
        
        try:
            db.add(novo_contato)
            importados += 1
        except Exception as e:
            db.rollback()
            erros.append(f"Erro ao importar {contato_nome}: {str(e)}")
            continue

    db.commit()
    
    return {
        "importados": importados,
        "erros": erros
    }
