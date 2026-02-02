from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

Base = declarative_base()

if DATABASE_URL:
    print(f"🔗 Conectando ao banco de dados...")
    
    # Configurações para melhor compatibilidade com Railway/Postgres
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        connect_args={
            "connect_timeout": 10,
            "options": "-c timezone=utc"
        }
    )
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    print("✅ Configuração do banco de dados concluída")
else:
    print("⚠️ DATABASE_URL não configurada - usando configuração lazy")
    engine = None
    SessionLocal = None

def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database not configured - DATABASE_URL is missing")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
