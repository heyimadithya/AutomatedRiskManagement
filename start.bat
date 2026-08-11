@echo off
echo Starting ARM backend on :8001 ...
start "ARM-API" cmd /k "cd /d %~dp0backend && .venv\Scripts\uvicorn.exe main:app --reload --host 127.0.0.1 --port 8001"
timeout /t 2 >nul
echo Starting ARM frontend on :5173 ...
start "ARM-UI" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Open http://localhost:5173
