@echo off
echo ===================================================
echo     Stock Manager - SECURE MODE
echo ===================================================
echo.
echo Building the secured production version...
echo This may take a moment.
echo.

cd /d "%~dp0"
call npm run build

echo.
echo ===================================================
echo Server is starting in SECURE MODE
echo ===================================================
echo.
echo Your source code is now hidden and optimized.
echo Use the "Network" address below to access from other devices.
echo.
echo Press Ctrl+C to stop.
echo.

call npm run preview -- --host

pause
