#!/bin/bash

# Define cleanup sequence to trap kills and gracefully stop background jobs
cleanup() {
    echo "Stopping Mesh End-to-End System..."
    # Suppress output if processes are already dead
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

# Trap terminal interruptions (Ctrl+C, etc)
trap cleanup SIGINT SIGTERM

echo "==================================================="
echo "    Starting Mesh End-to-End Clinical System       "
echo "==================================================="

echo "[1/3] Populating / Seeding Database in backend/ ..."
cd backend

# If standard linux python venv exists, activate it
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

export PYTHONPATH=$(pwd)
python3 -m app.seed
if [ $? -ne 0 ]; then
    echo "Database seeding failed! Exiting."
    exit 1
fi

echo "[2/3] Starting FastApi Backend Server..."
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait just briefly so backend can bind to port
sleep 1.5

echo "[3/3] Starting Vite React Frontend..."
cd ..
npm run dev &
FRONTEND_PID=$!

echo "==================================================="
echo "Mesh is now running flawlessly!"
echo "    • Backend API: http://localhost:8000/docs"
echo "    • Frontend UI: http://localhost:5173"
echo "    Press [Ctrl+C] to stop everything safely at once."
echo "==================================================="

# Use wait to keep the terminal blocking and responsive to traps
wait
