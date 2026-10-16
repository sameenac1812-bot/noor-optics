@echo off
title Sattva Tiffins - POS Print Service
cd /d "%~dp0"

echo ============================================================
echo         SATTVA TIFFINS - AUTOMATIC POS PRINT DAEMON         
echo ============================================================
echo   Running on Windows native POS engine.
echo   Press Ctrl+C at any time to close.
echo ============================================================
echo.

where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [Launcher] Node.js runtime detected. Starting pos-daemon.js...
    node pos-daemon.js
) else (
    echo [Launcher] Zero-Install Native Windows mode.
    echo [Launcher] Starting pos-daemon.ps1...
    powershell.exe -ExecutionPolicy Bypass -NoProfile -File "pos-daemon.ps1"
)

echo.
echo Daemon stopped.
pause
