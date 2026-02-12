import psycopg2
import sys

url = "postgresql://postgres:wMpYjIditRgHhffFyqgJioCxUkcLXcUE@nozomi.proxy.rlwy.net:11615/railway"

print(f"Tentando conectar ao banco...")
try:
    conn = psycopg2.connect(url)
    print("Conexao estabelecida com sucesso!")
    cur = conn.cursor()
    cur.execute("SELECT version();")
    print(f"Versao do banco: {cur.fetchone()}")
    cur.close()
    conn.close()
    print("Conexao fechada.")
except Exception as e:
    print(f"Erro ao conectar: {e}")
    sys.exit(1)
