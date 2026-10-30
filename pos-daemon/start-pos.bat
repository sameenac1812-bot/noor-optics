@echo off
setlocal
title Noor Optics - Portable POS Print Daemon
color 0B

echo ======================================================================
echo           NOOR OPTICS - PORTABLE POS PRINT DAEMON v2.4.0
echo            2.5-Inch Thermal Receipt Auto-Printing System
echo ======================================================================
echo.

cd /d "%~dp0"

REM 1. Cleanly terminate any stale process holding port 5001
for /f "tokens=5" %%p in ('netstat -aon 2^>nul ^| findstr /r ":5001\>.*LISTENING"') do (
    echo [RESTART] Port 5001 in use by PID %%p. Freeing port...
    taskkill /f /pid %%p >nul 2>nul
)
timeout /t 1 /nobreak >nul

REM 2. Detect Node.js runtime or fallback to PowerShell
set ENGINE=PS
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 set ENGINE=NODE

if "%ENGINE%"=="NODE" (
    echo [OK] Node.js runtime detected.
)
if "%ENGINE%"=="PS" (
    echo [WARN] Node.js not detected in PATH.
    echo [OK] Switching to Native Windows PowerShell Engine: pos-daemon.ps1
)

echo.
echo [STARTING] Launching print daemon on http://127.0.0.1:5001...
echo [INFO] Automatic receipt printing is ACTIVE for website and in-store orders.
echo.

:WATCHDOG_LOOP
if "%ENGINE%"=="NODE" (
    node pos-daemon.js
)
if "%ENGINE%"=="PS" (
    powershell.exe -ExecutionPolicy Bypass -NoProfile -File pos-daemon.ps1
)

echo.
echo [WARNING] Daemon process stopped.
echo [WATCHDOG] Restarting print daemon in 3 seconds... (Press Ctrl+C to stop)
timeout /t 3 /nobreak >nul
goto WATCHDOG_LOOP
