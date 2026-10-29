@echo off
title Geo-Attend Launch Hub
echo ===================================================
echo           Starting AI Geo-Attend System
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Backend API (Port 5000)...
start "Geo-Attend Backend" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe app.py"

timeout /t 3 >nul

echo [2/3] Starting Frontend Dev Server (Port 5173)...
start "Geo-Attend Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 >nul

echo [3/3] Starting Cloudflare HTTPS Tunnel for Mobile...
echo (Check the Cloudflare window for your https://*.trycloudflare.com mobile URL)
start "Geo-Attend Cloudflare Tunnel" cmd /k "cd /d %~dp0 && cloudflared.exe tunnel --protocol http2 --no-tls-verify --url https://localhost:5173"

echo.
echo ===================================================
echo All services launched!
echo Look at the 'Geo-Attend Cloudflare Tunnel' window to
echo copy the new https://*.trycloudflare.com link on your mobile!
echo ===================================================
pause
