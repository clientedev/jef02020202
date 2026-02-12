#!/bin/bash
set -e

echo "========================================="
echo "Nucleo 1.03 - Railway Quick Start"
echo "========================================="

# Set default port
PORT="${PORT:-8000}"
echo "Starting Application on port $PORT..."

exec gunicorn main:app \
    --bind "0.0.0.0:$PORT" \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
