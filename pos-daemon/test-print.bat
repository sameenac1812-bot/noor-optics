@echo off
setlocal
title Noor Optics - 2.5-Inch Thermal Receipt Test
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0test-print.ps1"
echo.
pause
