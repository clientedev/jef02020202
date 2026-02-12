from sqlalchemy import create_engine, text

URL = "postgresql://postgres:wMpYjIditRgHhffFyqgJioCxUkcLXcUE@nozomi.proxy.rlwy.net:11615/railway"

try:
    engine = create_engine(URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print(f"✅ CONEXÃO OK: {result.fetchone()}")
except Exception as e:
    print(f"❌ FALHA NA CONEXÃO: {e}")
