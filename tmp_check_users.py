from backend.database import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    result = conn.execute(text("SELECT id, nome, email, senha_hash, tipo FROM usuarios"))
    users = result.fetchall()
    for user in users:
        print(f"ID: {user.id}, Nome: {user.nome}, Email: {user.email}, Tipo: {user.tipo}")
        print(f"Hash: {user.senha_hash}")
        print("-" * 20)
