from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL")

Base = declarative_base()

# Lazy loaded objects
engine = None
SessionLocal = None

def get_engine():
    global engine, SessionLocal
    if engine is not None:
        return engine
    
    url = DATABASE_URL
    if not url:
        url = "sqlite:///./temp.db"
    
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+psycopg2://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        
    print(f"🚀 [INIT] Database engine starting with URL: {url.split('@')[-1]}")
    
    engine = create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5, # Reduced for faster start
        max_overflow=10,
        connect_args={"connect_timeout": 10} if "sqlite" not in url else {}
    )
    
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine

def get_db():
    global SessionLocal
    if SessionLocal is None:
        get_engine()
    
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
