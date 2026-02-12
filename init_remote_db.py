import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# URL fornecida pelo usuário
REMOTE_DB_URL = "postgresql://postgres:wMpYjIditRgHhffFyqgJioCxUkcLXcUE@nozomi.proxy.rlwy.net:11615/railway"

# Adicionar o diretório atual ao path para importar os modelos
sys.path.append(os.getcwd())

from backend.database import Base
from backend.utils.seed import (
    criar_usuario_admin_padrao, 
    criar_consultores_padrao, 
    criar_stages_padrao,
    popular_pipeline,
    criar_empresas_padrao,
    criar_prospeccoes_padrao
)

def run_remote_init():
    print(f"🚀 Iniciando conexão com o banco remoto...")
    
    # Garantir que usamos o driver psycopg2
    engine_url = REMOTE_DB_URL
    if engine_url.startswith("postgres://"):
        engine_url = engine_url.replace("postgres://", "postgresql+psycopg2://", 1)
    
    try:
        engine = create_engine(engine_url, echo=True)
        
        print("🛠️ Criando tabelas...")
        Base.metadata.create_all(bind=engine)
        print("✅ Tabelas criadas com sucesso!")
        
        Session = sessionmaker(bind=engine)
        db = Session()
        
        print("🌱 Populando dados básicos...")
        try:
            criar_usuario_admin_padrao(db)
            criar_consultores_padrao(db)
            criar_stages_padrao(db)
            print("✅ Dados básicos inseridos!")
            
            print("📦 Populando dados de demonstração (opcional)...")
            try:
                criar_empresas_padrao(db)
                popular_pipeline(db)
                criar_prospeccoes_padrao(db)
                print("✅ Dados de demonstração inseridos!")
            except Exception as e:
                print(f"⚠️ Aviso ao popular dados demo: {e}")
                
            db.commit()
        except Exception as e:
            print(f"❌ Erro ao popular banco: {e}")
            db.rollback()
        finally:
            db.close()
            
        print("\n✨ PROCESSO CONCLUÍDO COM SUCESSO! O banco está pronto.")
        
    except Exception as e:
        print(f"💥 ERRO FATAL: {e}")

if __name__ == "__main__":
    run_remote_init()
