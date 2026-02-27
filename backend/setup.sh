#!/bin/bash
set -e

# Strict environment initialization via uv
if ! command -v uv &> /dev/null; then
    echo "CRITICAL: uv not found. Install from https://github.com/astral-sh/uv"
    exit 1
fi

# Hermetic environment setup
uv venv --python 3.14
source .venv/bin/activate
uv sync --frozen --no-dev

echo "Runtime environment locked and synchronized."
printf "\nUsage:\n  uv run python main.py\n"
