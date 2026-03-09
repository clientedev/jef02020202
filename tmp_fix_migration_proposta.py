"""Railway PostgreSQL migration: add numero_proposta to cronograma_eventos and clean up programs table."""
import psycopg2

DATABASE_URL = "postgresql://postgres:wMpYjIditRgHhffFyqgJioCxUkcLXcUE@nozomi.proxy.rlwy.net:11615/railway"

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("Adding numero_proposta to cronograma_eventos...")
    cur.execute("ALTER TABLE cronograma_eventos ADD COLUMN IF NOT EXISTS numero_proposta VARCHAR(100);")
    
    print("Removing numero_proposta from programs (optional cleanup)...")
    try:
        cur.execute("ALTER TABLE programs DROP COLUMN IF EXISTS numero_proposta;")
    except Exception as e:
        print(f"Skipping drop: {e}")
        
    print("Migration finished successfully.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error during migration: {e}")
