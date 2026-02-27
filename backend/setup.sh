#!/bin/bash
set -e

# Strict environment initialization via uv
if ! command -v uv &> /dev/null; then
    echo "CRITICAL: uv not found. Install from https://github.com/astral-sh/uv"
    exit 1
fi

# Hermetic environment setup
uv venv --python 3.12 --seed
source .venv/bin/activate
uv sync --frozen --no-dev
uv run python -m spacy download en_core_web_sm

echo "Runtime environment locked and synchronized."
printf "\nUsage:\n  uv run python main.py\n"
