import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# URL fornecida pelo usuário
DATABASE_URL = "postgresql://postgres:wMpYjIditRgHhffFyqgJioCxUkcLXcUE@nozomi.proxy.rlwy.net:11615/railway"

# SQLAlchemy 1.4+ requires postgresql+psycopg2://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

print(f"--- Iniciando Inicialização do Banco Remoto ---")
print(f"Alvo: nozomi.proxy.rlwy.net:11615")

try:
    # Adicionando o diretório atual ao path para importar os models
    sys.path.append(os.getcwd())
    
    from backend.database import Base
    from backend.utils.seed import (
        criar_usuario_admin_padrao, 
        criar_empresas_padrao, 
        criar_consultores_padrao, 
        criar_stages_padrao, 
        popular_pipeline, 
        criar_prospeccoes_padrao
    )
    
    engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 30})
    
    # Teste de conexão simples
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
        print("✅ Conexão estabelecida!")

    print("🛠️ Criando tabelas...")
    Base.metadata.create_all(bind=engine)
    print("✅ Estrutura de tabelas criada com sucesso!")

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("🌱 Populando dados iniciais (Seed)...")
        criar_usuario_admin_padrao(db)
        print(" - Admin OK")
        criar_consultores_padrao(db)
        print(" - Consultores OK")
        criar_empresas_padrao(db)
        print(" - Empresas OK")
        criar_stages_padrao(db)
        print(" - Stages OK")
        popular_pipeline(db)
        print(" - Pipeline OK")
        criar_prospeccoes_padrao(db)
        print(" - Prospeccoes OK")
        
        db.commit()
        print("✅ Seed de dados concluído!")
    except Exception as e:
        print(f"⚠️ Aviso durante o seed: {e}")
        db.rollback()
    finally:
        db.close()

    print("--- Banco de Dados Remoto Pronto! ---")

except Exception as e:
    print(f"❌ ERRO CRÍTICO: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
