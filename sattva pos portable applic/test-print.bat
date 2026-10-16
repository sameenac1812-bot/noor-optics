@echo off
title Sattva Tiffins - Test Print
cd /d "%~dp0"

echo ============================================================
echo           SATTVA TIFFINS - IMMEDIATE TEST PRINT            
echo ============================================================
echo   Sending Order #103 test print (Customer Bill + Kitchen Slip)
echo   directly to your connected USB POS printer...
echo ============================================================
echo.

powershell.exe -ExecutionPolicy Bypass -NoProfile -Command "Set-Location -LiteralPath '%~dp0'; & '.\print-order.ps1' -OrderFile (Join-Path '%~dp0' 'sample-order.json')"

echo.
echo ============================================================
echo   If the bill printed: Your printer is configured 100%%!
echo   Now run 'start-pos.bat' to start automatic printing.
echo ============================================================
echo.
pause
