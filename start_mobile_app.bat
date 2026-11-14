@echo off
title Geo-Attend Launch Hub (Laptop + Mobile Live Sync)
color 0A
echo ===============================================================
echo      AI GEO-ATTEND: LAPTOP + MOBILE DUAL-DEVICE LAUNCHER
echo ===============================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Flask Backend & Database (Port 5000)...
start "Geo-Attend Backend (Port 5000)" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe app.py"

timeout /t 3 >nul

echo [2/3] Starting React Frontend Dev Server (Port 5173)...
start "Geo-Attend Frontend (Port 5173)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 >nul

echo [3/3] Starting Cloudflare HTTPS Live Tunnel...
start "Geo-Attend Cloudflare Tunnel" cmd /k "cd /d %~dp0 && cloudflared.exe tunnel --url http://localhost:5173"

echo.
echo ===============================================================
echo               HOW TO SHOW DEMO ON LAPTOP AND MOBILE:
echo ===============================================================
echo 1. In the window titled "Geo-Attend Cloudflare Tunnel", find the link:
echo       https://<random-words>.trycloudflare.com
echo.
echo 2. Open this EXACT SAME link in:
echo       - Laptop Browser (Chrome / Edge)
echo       - Mobile Phone Browser (Chrome / Safari)
echo.
echo 3. Why this works:
echo       - Both devices connect to YOUR LAPTOP'S backend & attendance.db!
echo       - All registered students (Roja, Padmavathi, Manisha, etc.) will show on mobile.
echo       - Attendance marked on mobile saves directly into attendance.db on laptop!
echo ===============================================================
echo.
pause
