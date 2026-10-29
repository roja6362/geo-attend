@echo off
title Geo-Attend Instant Cloud Publisher
echo ===================================================
echo     Geo-Attend 24/7 Mobile Cloud Link Generator
echo ===================================================
echo.
echo Your app is compiled with 24/7 Mobile Standalone Mode!
echo It will work on mobile even when your laptop is OFF
echo and backend is NOT running!
echo.
echo Opening Netlify Free Cloud Drop and your app folder...
echo.

start "" "https://app.netlify.com/drop"
explorer.exe /select,"%~dp0frontend\dist\index.html"

echo ===================================================
echo INSTRUCTIONS (Takes 5 seconds):
echo 1. In your browser, look at the Netlify Drop page.
echo 2. Drag the 'dist' folder into the browser drop zone.
echo 3. Netlify will give you your permanent 24/7 mobile link!
echo ===================================================
pause
