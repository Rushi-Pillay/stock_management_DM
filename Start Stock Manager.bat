@echo off
echo ===================================================
echo       Stock Manager - Dismantled Motors
echo ===================================================
echo.
echo Starting the server...
echo.
echo Once started, look for the "Network" address below.
echo Type that address into your phone/tablet browser.
echo.
echo Press Ctrl+C to stop the server.
echo.

cd /d "%~dp0"
call npm run dev -- --host

pause
