@echo off
setlocal
title Noor Optics - Portable POS Print Daemon
color 0B

echo ======================================================================
echo           NOOR OPTICS - INSTANT LIVE POS PRINT DAEMON v3.0.0
echo            LIVE PRINTING ONLY (Zero Backlog / Instant Print)
echo ======================================================================
echo.

cd /d "%~dp0"

REM 0. Optional Printer Name Argument (e.g. start-pos.bat "POS-80C")
if not "%~1"=="" (
    echo [CONFIG] Setting target printer to: %~1
    powershell -NoProfile -Command "$cfg = Get-Content 'config.json' -Raw | ConvertFrom-Json; $cfg.printerName = '%~1'; $cfg | ConvertTo-Json -Depth 4 | Set-Content 'config.json' -Encoding UTF8"
)

REM 1. Cleanly terminate any stale process holding port 5001
powershell -NoProfile -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue" 2>nul
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
powershell -NoProfile -Command "Get-Process -Id (Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue).OwningProcess -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue" 2>nul
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
