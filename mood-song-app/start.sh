#!/usr/bin/env bash
# MoodDrive : installe ce qu'il faut au premier lancement, puis démarre l'app sur http://localhost:8000
set -euo pipefail
cd "$(dirname "$0")"
ROOT="$(pwd)"
PORT="${PORT:-8000}"

# ---------- Python (3.10 à 3.13, requis par TensorFlow / Keras 3)
if [ ! -x backend/.venv/bin/python ]; then
  echo "▸ Première installation du backend (TensorFlow, ~2-3 min)…"
  PY=""
  for candidate in python3.12 python3.11 python3.13 python3.10 python3; do
    if command -v "$candidate" >/dev/null 2>&1 && "$candidate" -c 'import sys; sys.exit(0 if (3,10) <= sys.version_info[:2] <= (3,13) else 1)'; then
      PY="$candidate"; break
    fi
  done
  if [ -z "$PY" ]; then
    echo "✗ Il faut Python 3.10, 3.11, 3.12 ou 3.13 (https://www.python.org/downloads/)." >&2
    exit 1
  fi
  if command -v uv >/dev/null 2>&1; then
    uv venv -q -p "$PY" backend/.venv
    uv pip install -q -p backend/.venv/bin/python -r backend/requirements.txt
  else
    "$PY" -m venv backend/.venv
    backend/.venv/bin/python -m pip install -q --upgrade pip
    backend/.venv/bin/python -m pip install -q -r backend/requirements.txt
  fi
fi

# ---------- Interface (déjà compilée dans frontend/dist ; recompilée seulement si absente)
if [ ! -f frontend/dist/index.html ]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "✗ frontend/dist manque et Node.js n'est pas installé (https://nodejs.org)." >&2
    exit 1
  fi
  echo "▸ Compilation de l'interface…"
  (cd frontend && npm install --silent && npm run build --silent)
fi

echo "▸ Chargement du modèle…"
( for _ in $(seq 1 120); do
    if curl -s "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then
      echo ""
      echo "  ✓ MoodDrive est prêt : http://localhost:$PORT   (Ctrl+C pour arrêter)"
      echo ""
      if [ -n "${NO_OPEN:-}" ]; then :; elif command -v open >/dev/null 2>&1; then open "http://localhost:$PORT"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "http://localhost:$PORT"; fi
      break
    fi
    sleep 1
  done ) &

cd "$ROOT/backend"
exec .venv/bin/python -m uvicorn app:app --host 127.0.0.1 --port "$PORT" --log-level warning
