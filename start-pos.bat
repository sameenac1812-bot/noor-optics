@echo off
title Sattva Tiffins - POS Print Service
cd /d "%~dp0"

echo ============================================================
echo         SATTVA TIFFINS - AUTOMATIC POS PRINT DAEMON         
echo ============================================================
echo   High-Speed Zero-Delay Thermal Receipt Printing Engine
echo   Keep this window open while your restaurant is operating!
echo   Press Ctrl+C at any time to stop.
echo ============================================================
echo.

:: Automatically free port 5001 from any orphaned background process
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $conn = Get-NetTCPConnection -LocalPort 5001 -ErrorAction SilentlyContinue; if ($conn) { $pidToKill = $conn.OwningProcess | Select-Object -Unique; foreach ($p in $pidToKill) { if ($p -gt 0 -and $p -ne $PID) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } } } } catch {}" >nul 2>&1

:loop
where node >nul 2>nul
if %errorlevel% equ 0 goto run_node
goto run_powershell

:run_node
echo [Launcher] Starting POS Print Daemon: Node.js Engine...
node pos-daemon.js
goto watchdog

:run_powershell
echo [Launcher] Starting POS Print Daemon: PowerShell Engine...
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "pos-daemon.ps1"
goto watchdog

:watchdog
echo.
echo [Watchdog] POS Daemon disconnected. Reconnecting in 3 seconds...
powershell.exe -NoProfile -Command "Start-Sleep -Seconds 3" >nul 2>&1
goto loop
