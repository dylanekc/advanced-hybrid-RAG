#!/bin/bash
set -e

PROJECT_DIR="$HOME/project_perso/local-rag-app"

cd "$PROJECT_DIR/backend"
source venv/bin/activate

echo "🚀 Démarrage de FastAPI..."
uvicorn serveur:app --reload --port 8000 &
backend_pid=$!
trap 'kill "$backend_pid" 2>/dev/null || true' EXIT

cd "$PROJECT_DIR/frontend"
echo "🎨 Démarrage de Next.js..."
npm run dev