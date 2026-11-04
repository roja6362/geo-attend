@echo off
title Geo-Attend Local Runner
color 0a
cls
echo ===================================================
echo             STARTING GEO-ATTEND LOCAL
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Python AI Backend (Port 5000)...
start "Geo-Attend Backend (Port 5000)" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe app.py"

timeout /t 3 >nul

echo [2/2] Starting Frontend Web App (Port 5173)...
start "Geo-Attend Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 4 >nul

echo.
echo Opening browser to http://localhost:5173...
start "" "http://localhost:5173"

echo ===================================================
echo System is running!
echo Backend:  http://127.0.0.1:5000
echo Frontend: http://localhost:5173
echo ===================================================
pause
