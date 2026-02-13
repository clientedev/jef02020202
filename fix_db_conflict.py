import psycopg2
import os

# Database URL provided by user
DB_URL = "postgresql://postgres:wMpYjIditRgHhffFyqgJioCxUkcLXcUE@nozomi.proxy.rlwy.net:11615/railway"

def fix_database():
    print("Connecting to database...")
    try:
        # Add timeout and sslmode
        conn = psycopg2.connect(DB_URL, connect_timeout=10, sslmode='require')
        conn.autocommit = True
        cur = conn.cursor()
        
        print("Checking for existing 'feriados' type or table...")
        
        # Check if table exists
        cur.execute("SELECT to_regclass('public.feriados');")
        table_exists = cur.fetchone()[0]
        print(f"Table 'feriados' exists: {table_exists}")
        
        # Check if type exists specifically
        cur.execute("SELECT typname FROM pg_type WHERE typname = 'feriados';")
        type_exists = cur.fetchone()
        print(f"Type 'feriados' exists: {type_exists}")

        if type_exists and not table_exists:
            print("CONFLICT DETECTED: Type 'feriados' exists but table does not.")
            print("Attempting to DROP TYPE feriados...")
            try:
                cur.execute("DROP TYPE feriados CASCADE;")
                print("✅ Type dropped successfully.")
            except Exception as e:
                print(f"❌ Failed to drop type: {e}")
        elif table_exists:
             print("Table already exists. verifying schema...")
             # Maybe the schema is wrong?
             # If table exists, create_all should have skipped it.
             # The error happened during CREATE TABLE, so SQLAlchemy thought it didn't exist.
             pass
        else:
            print("No conflict detected locally? That's strange given the error.")

        cur.close()
        conn.close()
        print("Done.")
        
    except Exception as e:
        print(f"Connection failed or error: {e}")

if __name__ == "__main__":
    fix_database()
