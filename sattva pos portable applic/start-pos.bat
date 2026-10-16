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

:loop
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo [Launcher] Starting POS Print Daemon (Node.js engine)...
    node pos-daemon.js
) else (
    echo [Launcher] Starting POS Print Daemon (PowerShell engine)...
    powershell.exe -ExecutionPolicy Bypass -NoProfile -File "pos-daemon.ps1"
)

echo.
echo [Watchdog] POS Daemon disconnected. Reconnecting in 3 seconds...
timeout /t 3 /nobreak >nul
goto loop
