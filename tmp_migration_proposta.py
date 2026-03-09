"""Railway PostgreSQL migration: add numero_proposta to programs table."""
import psycopg2

DATABASE_URL = "postgresql://postgres:wMpYjIditRgHhffFyqgJioCxUkcLXcUE@nozomi.proxy.rlwy.net:11615/railway"

conn = psycopg2.connect(DATABASE_URL)
conn.autocommit = True
cur = conn.cursor()

try:
    cur.execute("""
        ALTER TABLE programs
        ADD COLUMN IF NOT EXISTS numero_proposta VARCHAR(100);
    """)
    print("✅ Column 'numero_proposta' added to 'programs' table (or already existed).")
except Exception as e:
    print(f"❌ Error: {e}")
finally:
    cur.close()
    conn.close()
