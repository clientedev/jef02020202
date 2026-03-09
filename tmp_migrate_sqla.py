from sqlalchemy import text
from backend.database import get_engine
import os

def run_migration():
    # Force use of provided URL if not in env
    if not os.getenv("DATABASE_URL"):
        os.environ["DATABASE_URL"] = "postgresql://postgres:wMpYjIditRgHhffFyqgJioCxUkcLXcUE@nozomi.proxy.rlwy.net:11615/railway"
    
    engine = get_engine()
    with engine.connect() as connection:
        # Avoid transactions for ALTER TABLE if possible, but SQLAlchemy usually uses one.
        # Adding IF NOT EXISTS is safe.
        print("Checking/Adding numero_proposta to cronograma_eventos...")
        connection.execute(text("ALTER TABLE cronograma_eventos ADD COLUMN IF NOT EXISTS numero_proposta VARCHAR(100);"))
        
        print("Cleaning up programs table...")
        try:
            connection.execute(text("ALTER TABLE programs DROP COLUMN IF EXISTS numero_proposta;"))
        except:
            pass
        
        connection.commit()
        print("Migration committed.")
        
        # Verify
        result = connection.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='cronograma_eventos' AND column_name='numero_proposta';")).fetchone()
        if result:
            print(f"Verified: {result[0]} exists.")
            return True
        return False

if __name__ == "__main__":
    try:
        if run_migration():
            print("MIGRATION_SUCCESS")
        else:
            print("MIGRATION_VERIFICATION_FAILED")
    except Exception as e:
        print(f"MIGRATION_ERROR: {e}")
