#!/bin/bash

echo "========================================="
echo "Iniciando aplicacao Nucleo 1.03"
echo "========================================="

# Ativar ambiente virtual do Nixpacks (Railway)
if [ -d "/opt/venv" ]; then
    echo "Ativando ambiente virtual Python..."
    source /opt/venv/bin/activate
fi

# Verificar DATABASE_URL (aviso, mas não bloqueia inicialização)
if [ -z "$DATABASE_URL" ]; then
    echo "AVISO: DATABASE_URL nao configurada - algumas funcionalidades podem nao funcionar"
else
    echo "DATABASE_URL: configurada"
fi

# Definir porta - Railway define automaticamente via variável PORT
export PORT="${PORT:-8000}"
echo "PORT: $PORT"

# Iniciar servidor diretamente com configurações otimizadas para Railway
echo ""
echo "========================================="
echo "Iniciando servidor Uvicorn na porta $PORT..."
echo "========================================="

# Usar exec para que o processo uvicorn receba os sinais diretamente
exec python -m uvicorn main:app \
    --host 0.0.0.0 \
    --port "$PORT" \
    --log-level info \
    --no-access-log \
    --timeout-keep-alive 30
