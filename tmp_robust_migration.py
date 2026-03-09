import psycopg2
import time

DATABASE_URL = "postgresql://postgres:wMpYjIditRgHhffFyqgJioCxUkcLXcUE@nozomi.proxy.rlwy.net:11615/railway"

def run_migration():
    for i in range(3):
        try:
            print(f"Attempt {i+1}...")
            conn = psycopg2.connect(DATABASE_URL, connect_timeout=10)
            conn.autocommit = True
            cur = conn.cursor()
            
            print("Applying ALTER TABLE cronograma_eventos...")
            cur.execute("ALTER TABLE cronograma_eventos ADD COLUMN IF NOT EXISTS numero_proposta VARCHAR(100);")
            
            print("Applying clean up on programs...")
            try:
                cur.execute("ALTER TABLE programs DROP COLUMN IF EXISTS numero_proposta;")
            except:
                pass
                
            print("Verifying column in cronograma_eventos...")
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='cronograma_eventos' AND column_name='numero_proposta';")
            result = cur.fetchone()
            if result:
                print(f"Success! Column {result[0]} exists.")
                cur.close()
                conn.close()
                return True
            else:
                print("Column not found after migration!")
            
            cur.close()
            conn.close()
        except Exception as e:
            print(f"Error on attempt {i+1}: {e}")
            time.sleep(2)
    return False

if __name__ == "__main__":
    if run_migration():
        print("MIGRATION_COMPLETED_SUCCESSFULLY")
    else:
        print("MIGRATION_FAILED")
