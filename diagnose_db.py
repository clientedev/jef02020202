import sys
import os
from sqlalchemy import create_engine, text

# Conectando ao banco fornecido
URL = "postgresql://postgres:wMpYjIditRgHhffFyqgJioCxUkcLXcUE@nozomi.proxy.rlwy.net:11615/railway"

# Adiciona path para importar modelos
sys.path.append(os.getcwd())

from backend.database import Base
# Import specific classes based on __init__.py verification
from backend.models import Usuario, Empresa, Prospeccao, Contato, Agendamento, CronogramaEvento

def diagnose():
    try:
        # PostgreSQL specific URL adjustment
        engine_url = URL
        if engine_url.startswith("postgres://"):
            engine_url = engine_url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif engine_url.startswith("postgresql://"):
            engine_url = engine_url.replace("postgresql://", "postgresql+psycopg2://", 1)

        engine = create_engine(engine_url)
        print("🔍 Testando conexão básica...")
        with engine.connect() as conn:
            res = conn.execute(text("SELECT version()"))
            print(f"✅ Conectado ao: {res.fetchone()[0]}")
            
        print("🛠️ Tentando criar tabelas em massa...")
        Base.metadata.create_all(bind=engine)
        print("✨ Tabelas criadas com sucesso!")
                
    except Exception as e:
        print(f"💥 Erro de diagnóstico: {e}")

if __name__ == "__main__":
    diagnose()
