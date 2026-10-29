@echo off
title Geo-Attend 24/7 Permanent Cloud Deployment Hub
color 0b
cls
echo ===================================================================
echo             GEO-ATTEND 24/7 PERMANENT CLOUD DEPLOYMENT
echo   (Works everywhere on mobile/PC even when your laptop is OFF)
echo ===================================================================
echo.
echo Select an option:
echo.
echo [1] One-Click Build Frontend (Compiles newest production assets)
echo [2] Deploy Frontend to Vercel (Permanent 24/7 HTTPS domain)
echo [3] Deploy Frontend to Netlify Drop (Instant Drag-and-Drop, no login)
echo [4] Open Render.com to Deploy 24/7 Backend (Free Web Service)
echo [5] Open Hugging Face to Deploy 24/7 AI Backend (16GB RAM Free ML Host)
echo [6] View Complete Step-by-Step Deployment Guide
echo [7] Exit
echo.
set /p choice="Enter choice [1-7]: "

if "%choice%"=="1" goto build_frontend
if "%choice%"=="2" goto deploy_vercel
if "%choice%"=="3" goto deploy_netlify
if "%choice%"=="4" goto deploy_render
if "%choice%"=="5" goto deploy_hf
if "%choice%"=="6" goto view_guide
if "%choice%"=="7" exit
goto end

:build_frontend
cls
echo ===================================================================
echo Building Frontend Production Bundle...
echo ===================================================================
cd /d "%~dp0frontend"
call npm run build
echo.
echo Production build finished! Assets are in 'frontend\dist'.
pause
goto end

:deploy_vercel
cls
echo ===================================================================
echo Deploying Frontend to Vercel...
echo ===================================================================
cd /d "%~dp0frontend"
call npm run build
echo.
echo Starting Vercel deployment...
call npx vercel --prod
pause
goto end

:deploy_netlify
cls
echo ===================================================================
echo Opening Netlify Drop for Instant 24/7 Deployment...
echo ===================================================================
cd /d "%~dp0frontend"
call npm run build
echo.
echo 1. The browser will open https://app.netlify.com/drop
echo 2. File Explorer will open showing the 'dist' folder.
echo 3. Drag the 'dist' folder directly into your browser window!
echo 4. You get an instant permanent 24/7 https://*.netlify.app link!
echo.
start "" "https://app.netlify.com/drop"
explorer.exe /select,"%~dp0frontend\dist\index.html"
pause
goto end

:deploy_render
cls
echo ===================================================================
echo Opening Render.com Dashboard for Backend Deployment...
echo ===================================================================
echo 1. Push this project to GitHub (e.g. github.com/your-username/geo-attend).
echo 2. On Render.com, click "New +" -> "Web Service".
echo 3. Select your GitHub repository.
echo 4. Render will detect 'render.yaml' or set:
echo      Root Directory: backend
echo      Build Command:  pip install -r requirements.txt && python download_weights.py
echo      Start Command:  gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120
echo 5. Copy your new permanent backend URL (e.g. https://geo-attend-api.onrender.com)!
echo.
start "" "https://dashboard.render.com"
pause
goto end

:deploy_hf
cls
echo ===================================================================
echo Opening Hugging Face Spaces (16GB RAM Free ML Hosting)...
echo ===================================================================
echo 1. Go to huggingface.co/spaces and click "Create new Space".
echo 2. Choose "Docker" -> "Blank".
echo 3. Upload the contents of your 'backend' folder (it has Dockerfile).
echo 4. You get a permanent 24/7 16GB RAM AI backend URL!
echo.
start "" "https://huggingface.co/spaces"
pause
goto end

:view_guide
cls
start notepad.exe "%~dp0DEPLOYMENT_GUIDE.md"
goto end

:end
