#!/bin/bash

echo "========================================="
echo "Iniciando aplicacao Nucleo 1.03"
echo "========================================="

# Ativar ambiente virtual do Nixpacks (Railway)
if [ -d "/opt/venv" ]; then
    echo "Ativando ambiente virtual Python..."
    source /opt/venv/bin/activate
fi

# CRÍTICO: Carregar variáveis de ambiente do Railway
set -a
if [ -f "/etc/environment" ]; then
    source /etc/environment 2>/dev/null || true
fi
if [ -f "$RAILWAY_PROJECT_ROOT/.env" ]; then
    source "$RAILWAY_PROJECT_ROOT/.env" 2>/dev/null || true
fi
if [ -f ".env" ]; then
    source .env 2>/dev/null || true
fi
set +a

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "ERRO: DATABASE_URL nao configurada!"
    exit 1
else
    echo "DATABASE_URL: OK"
fi

# Rodar migrações
echo "Aplicando migrações do banco de dados..."
alembic upgrade head
echo "Migrações concluídas!"

# Definir porta - Railway define automaticamente via variável PORT
export PORT="${PORT:-8000}"
# Remove any non-digit characters from PORT (sanitization)
export PORT=$(echo $PORT | tr -cd '0-9')

echo "PORT: $PORT"

if [ -z "$PORT" ]; then
  echo "ERROR: PORT is empty after sanitization"
  exit 1
fi

# Iniciar servidor com Gunicorn (Produção)
echo ""
echo "========================================="
echo "Iniciando Gunicorn (Uvicorn Worker) na porta $PORT..."
echo "Workers: 2 | Timeout: 120s"
echo "========================================="

exec gunicorn main:app \
    --bind "0.0.0.0:$PORT" \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
