@echo off
title Sattva Tiffins - Printer Diagnostic and Test Print
cd /d "%~dp0"

echo ============================================================
echo     SATTVA TIFFINS - PRINTER DIAGNOSTIC AND TEST PRINT     
echo ============================================================
echo   Running diagnostic on this PC...
echo.

powershell.exe -ExecutionPolicy Bypass -NoProfile -Command ^
  "Write-Host '[1] Printers installed on this PC:' -ForegroundColor Cyan; " ^
  "$printers = @(); " ^
  "try { $printers = Get-Printer -ErrorAction SilentlyContinue } catch {}; " ^
  "if (-not $printers) { try { $printers = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue } catch {} }; " ^
  "if ($printers) { " ^
  "  $printers | Select-Object Name, DriverName, PortName, PrinterStatus | Format-Table -AutoSize; " ^
  "} else { " ^
  "  Write-Host '   No printers found in Windows yet!' -ForegroundColor Yellow; " ^
  "}; " ^
  "Write-Host '[2] USB Ports Detected:' -ForegroundColor Cyan; " ^
  "$ports = Get-PrinterPort -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'USB*' }; " ^
  "if ($ports) { $ports | Select-Object Name, Description | Format-Table -AutoSize } " ^
  "else { Write-Host '   No USB printer port found. Please check printer USB cable and power switch!' -ForegroundColor Yellow }; " ^
  "Write-Host '[3] Sending Test Print...' -ForegroundColor Cyan; " ^
  "& '.\print-order.ps1' -OrderFile 'sample-order.json'"

echo.
echo ============================================================
echo  - If bill printed: You are ready! Run 'start-pos.bat'
echo  - If printer not detected: Run 'setup-printer.bat' as Admin
echo ============================================================
echo.
pause
