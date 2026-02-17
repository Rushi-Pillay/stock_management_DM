@echo off
title Dismantled Motors - Printer Bridge
echo Starting Printer Bridge Server...
cd printer-server
if not exist node_modules (
    echo Installing dependencies...
    call npm install
)
echo Server is running! Keep this window open to print.
echo.
npm start
pause
