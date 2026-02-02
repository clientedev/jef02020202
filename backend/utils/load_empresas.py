import openpyxl
from backend.database import SessionLocal
from backend.models.empresas import Empresa
from datetime import datetime
import sys

def load_empresas_from_excel(file_path: str = "attached_assets/empresas_1762436676869.xlsx"):
    """Carrega empresas do arquivo Excel para o banco de dados"""
    
    print(f"Carregando empresas do arquivo: {file_path}")
    
    try:
        wb = openpyxl.load_workbook(file_path)
        ws = wb.active
        
        db = SessionLocal()
        
        empresas_criadas = 0
        empresas_atualizadas = 0
        cnpjs_processados = set()
        
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row[0]:
                continue
            
            empresa_nome = str(row[0]) if row[0] else None
            cnpj = str(row[1]) if row[1] else None
            sigla = str(row[3]) if row[3] else None
            porte = str(row[4]) if row[4] else None
            er = str(row[5]) if row[5] else None
            carteira = str(row[6]) if row[6] else None
            endereco = str(row[7]) if row[7] else None
            bairro = str(row[8]) if row[8] else None
            municipio = str(row[10]) if row[10] else None
            estado = str(row[11]) if row[11] else None
            pais = str(row[12]) if row[12] else None
            area = str(row[13]) if row[13] else None
            cnae_principal = str(row[14]) if row[14] else None
            descricao_cnae = str(row[15]) if row[15] else None
            tipo_empresa = str(row[16]) if row[16] else None
            
            try:
                numero_funcionarios = int(row[18]) if row[18] and isinstance(row[18], (int, float)) else None
            except (ValueError, TypeError):
                numero_funcionarios = None
                
            observacao = str(row[19]) if row[19] else None
            
            if cnpj in cnpjs_processados:
                continue
                
            cnpjs_processados.add(cnpj)
            
            empresa_existente = db.query(Empresa).filter(Empresa.cnpj == cnpj).first()
            
            if empresa_existente:
                empresa_existente.empresa = empresa_nome
                empresa_existente.sigla = sigla
                empresa_existente.porte = porte
                empresa_existente.er = er
                empresa_existente.carteira = carteira
                empresa_existente.endereco = endereco
                empresa_existente.bairro = bairro
                empresa_existente.municipio = municipio
                empresa_existente.estado = estado
                empresa_existente.pais = pais
                empresa_existente.area = area
                empresa_existente.cnae_principal = cnae_principal
                empresa_existente.descricao_cnae = descricao_cnae
                empresa_existente.tipo_empresa = tipo_empresa
                empresa_existente.numero_funcionarios = numero_funcionarios
                empresa_existente.observacao = observacao
                empresa_existente.data_atualizacao = datetime.utcnow()
                empresas_atualizadas += 1
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
        print(f"✓ {empresas_criadas} empresas criadas")
        print(f"✓ {empresas_atualizadas} empresas atualizadas")
        print(f"✓ Total: {empresas_criadas + empresas_atualizadas} empresas processadas")
        
        db.close()
        
    except Exception as e:
        print(f"❌ Erro ao carregar empresas: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    load_empresas_from_excel()
