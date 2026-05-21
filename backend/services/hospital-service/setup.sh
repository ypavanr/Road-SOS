#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

python3 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

mkdir -p cache

cp -n .env.example .env 2>/dev/null || true

echo ""
echo "Setup complete. To start the service:"
echo "  source .venv/bin/activate"
echo "  python main.py"
