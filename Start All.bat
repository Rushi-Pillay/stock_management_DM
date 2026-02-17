@echo off
title Dismantled Motors - Start All
echo Starting Printer Bridge Server and Stock Manager App...

start "Printer Server" cmd /k "call "Start Printer Server.bat""

echo Waiting for printer server...
timeout /t 2 >nul

echo Starting Web App...
call "Start Stock Manager.bat"
