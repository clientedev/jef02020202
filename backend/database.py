from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

Base = declarative_base()

if DATABASE_URL:
    # SQLAlchemy 1.4+ requires postgresql+psycopg2:// for Postgres
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)
        
    print(f"Conectando ao banco de dados: {DATABASE_URL.split('@')[-1]}")
    
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=10,
        max_overflow=20,
        connect_args={
            "connect_timeout": 30
        }
    )
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    print("Configuracao do banco de dados concluida")
else:
    print("DATABASE_URL nao configurada - usando SQLite local (temp.db)")
    DATABASE_URL = "sqlite:///./temp.db"
    engine = create_engine(
        DATABASE_URL, connect_args={"check_same_thread": False}
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    print("SQLite configurado com sucesso")

def get_db():
    if SessionLocal is None:
        raise RuntimeError("Database not configured - DATABASE_URL is missing")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
