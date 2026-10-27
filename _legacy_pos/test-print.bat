@echo off
title Noor Opticals - Test Bill Print
cd /d "%~dp0"

echo ============================================================
echo             NOOR OPTICALS - THERMAL TEST PRINT             
echo ============================================================
echo   Sending optical receipt test print directly to POS printer...
echo ============================================================
echo.

powershell.exe -ExecutionPolicy Bypass -NoProfile -Command "Set-Location -LiteralPath '%~dp0'; & '.\print-order.ps1' -OrderFile (Join-Path '%~dp0' 'sample-order.json')"

echo.
echo ============================================================
echo   Test print sent to POS-80.
echo ============================================================
echo.
pause
