@echo off
setlocal
title Noor Optics - Thermal Printer Diagnostic
cd /d "%~dp0"
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0diagnose-printer.ps1"
echo.
pause
