@echo off
title Deploy Geo-Attend to Vercel (Permanent 24/7 Link)
color 0b
cd /d "%~dp0frontend"

echo ===================================================
echo       Deploying Geo-Attend 24/7 to Vercel
echo ===================================================
echo.
echo [1/3] Building latest production bundle...
call npm run build

echo.
echo [2/3] Authenticating with Vercel...
echo (Select 'Continue with GitHub' or 'Email' and press ENTER)
echo.
call npx vercel login

echo.
echo [3/3] Publishing to Vercel Production Cloud...
echo (Press ENTER on the questions to accept defaults)
echo.
call npx vercel --prod

echo.
echo ===================================================
echo Deployment complete! Copy your permanent .vercel.app link.
echo ===================================================
pause
