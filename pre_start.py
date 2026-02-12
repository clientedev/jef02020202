import time
from sqlalchemy import text
from backend.database import get_engine, Base, SessionLocal
from backend.utils.seed import (
    criar_usuario_admin_padrao, 
    criar_consultores_padrao, 
    criar_stages_padrao,
    popular_pipeline,
    criar_empresas_padrao,
    criar_prospeccoes_padrao
)

def init_db():
    print("🛠️  [PRE-START] Iniciando inicialização do banco de dados...")
    
    retries = 5
    engine = None
    
    while retries > 0:
        try:
            engine = get_engine()
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("✅ [PRE-START] Conexão com o banco estabelecida.")
            break
        except Exception as e:
            retries -= 1
            print(f"⚠️  [PRE-START] Tentativa de conexão falhou ({5-retries}/5): {e}")
            if retries == 0:
                print("❌ [PRE-START] Não foi possível conectar ao banco. Abortando.")
                return
            time.sleep(5)

    try:
        print("🛠️  [PRE-START] Criando tabelas...")
        Base.metadata.create_all(bind=engine)
        
        db = SessionLocal()
        try:
            print("🌱 [PRE-START] Populando dados iniciais...")
            criar_usuario_admin_padrao(db)
            criar_consultores_padrao(db)
            criar_stages_padrao(db)
            
            # Opcionais - Remove se não quiser dados de demo em cada deploy
            # criar_empresas_padrao(db)
            # popular_pipeline(db)
            
            db.commit()
            print("✨ [PRE-START] Banco de dados inicializado com sucesso!")
        except Exception as e:
            print(f"⚠️  [PRE-START] Erro ao popular dados: {e}")
            db.rollback()
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ [PRE-START] Erro fatal na inicialização: {e}")

if __name__ == "__main__":
    init_db()
