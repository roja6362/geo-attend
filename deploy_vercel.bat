@echo off
title Deploy to Vercel (Permanent 24/7 Link)
cd /d "%~dp0frontend"
echo ===================================================
echo     Publishing Geo-Attend directly to Vercel...
echo ===================================================
echo.
npx vercel --prod
pause
