#!/bin/bash
set -e

echo "========================================="
echo "Nucleo 1.03 - Docker Entrypoint"
echo "========================================="

# Set default port - Railway uses PORT env variable
PORT="${PORT:-8000}"
export PORT
echo "PORT: $PORT"

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is required but not set"
    echo "Please configure DATABASE_URL environment variable in Railway"
    exit 1
fi
echo "DATABASE_URL: configured"

# Wait for database to be ready (max 30 seconds)
echo "Waiting for database to be ready..."
DB_READY=false
for i in {1..30}; do
    if python -c "
import sys
from sqlalchemy import create_engine, text
import os
try:
    engine = create_engine(os.environ['DATABASE_URL'])
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    sys.exit(0)
except Exception as e:
    sys.exit(1)
" 2>/dev/null; then
        echo "Database is ready!"
        DB_READY=true
        break
    fi
    echo "Attempt $i/30: Database not ready, waiting..."
    sleep 1
done

if [ "$DB_READY" = false ]; then
    echo "ERROR: Database not reachable after 30 attempts"
    exit 1
fi

# Run Alembic migrations - MUST succeed
echo ""
echo "Running database migrations..."

# Check if alembic_version table exists, if not stamp to latest known version before new columns
python -c "
from sqlalchemy import create_engine, text
import os

database_url = os.environ['DATABASE_URL']
engine = create_engine(database_url)

with engine.connect() as conn:
    # Check if alembic_version table exists
    result = conn.execute(text(\"\"\"
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'alembic_version'
    \"\"\"))
    if not result.fetchone():
        # Check required tables exist (database was created with create_all)
        result = conn.execute(text(\"\"\"
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name IN ('empresas', 'usuarios', 'prospeccoes', 'agendamentos')
        \"\"\"))
        table_count = result.scalar()
        
        if table_count >= 4:
            print(f'Database has {table_count} core tables without Alembic tracking.')
            print('Stamping to f80b2b33a570 (last revision before contact field migration)...')
            # Tables exist but no alembic tracking - stamp to version before new migration
            import subprocess
            subprocess.run(['python', '-m', 'alembic', 'stamp', 'f80b2b33a570'], check=True)
            print('Alembic stamped successfully!')
            print('NOTE: If migration issues occur, verify schema matches expected state.')
        elif table_count > 0:
            print(f'WARNING: Partial database detected ({table_count} tables). Manual review needed.')
            print('Attempting fresh migration...')
        else:
            print('Fresh database - migrations will create tables from scratch.')
    else:
        result = conn.execute(text('SELECT version_num FROM alembic_version'))
        version = result.scalar()
        print(f'Alembic version table exists (current: {version}) - normal migration flow')
"

# Now run the actual migrations
python -m alembic upgrade head
if [ $? -ne 0 ]; then
    echo "ERROR: Database migrations failed!"
    exit 1
fi
echo "Migrations completed successfully!"

# Run seed scripts once before starting workers
echo ""
echo "Running initial seed..."
python -c "
from backend.database import SessionLocal, engine, Base
from backend.utils.seed import criar_usuario_admin_padrao, criar_empresas_padrao, criar_consultores_padrao, criar_stages_padrao

print('Creating tables if needed...')
Base.metadata.create_all(bind=engine)

db = SessionLocal()
try:
    criar_usuario_admin_padrao(db)
    criar_consultores_padrao(db)
    criar_empresas_padrao(db)
    criar_stages_padrao(db)
    print('Seed completed!')
except Exception as e:
    print(f'Seed info: {e}')
finally:
    db.close()
"
echo "Seed process completed!"

# Mark that we've already seeded (for Docker/production)
export SKIP_STARTUP_SEED=true

# Start Gunicorn with Uvicorn workers
echo ""
echo "========================================="
echo "Starting Gunicorn on port $PORT..."
echo "========================================="

exec gunicorn main:app \
    --bind "0.0.0.0:$PORT" \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --timeout 120 \
    --keep-alive 5 \
    --access-logfile - \
    --error-logfile - \
    --capture-output
