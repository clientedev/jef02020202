from backend.database import get_engine
from sqlalchemy import text

engine = get_engine()
with engine.connect() as conn:
    # Check programs table
    result = conn.execute(text("SELECT id, nome, carga_horaria, empresa_id FROM programs"))
    rows = result.fetchall()
    print(f"Total de programas: {len(rows)}")
    for r in rows:
        print(f"  ID: {r.id}, Nome: {r.nome}, Carga: {r.carga_horaria}h, Empresa: {r.empresa_id}")
