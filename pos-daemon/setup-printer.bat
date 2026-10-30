@echo off
setlocal enabledelayedexpansion
title Noor Optics - Thermal Printer Setup & Configuration
color 0E

echo ======================================================================
echo           NOOR OPTICS - THERMAL PRINTER SETUP WIZARD
echo ======================================================================
echo.

cd /d "%~dp0"

echo Scanning installed Windows printers...
echo.
powershell -Command "Get-Printer | Format-Table -AutoSize Name, DriverName, PortName, PrinterStatus"
echo.

echo ----------------------------------------------------------------------
echo Please enter the exact printer name as shown above.
echo (e.g., POS-80, Generic / Text Only, XP-58, Everycom)
echo Or press Enter to use default [POS-80]:
set /p PRINTER_CHOICE="Printer Name: "

if "%PRINTER_CHOICE%"=="" set PRINTER_CHOICE=POS-80

echo.
echo Updating config.json with printer: %PRINTER_CHOICE%...

powershell -Command "$cfg = Get-Content 'config.json' -Raw | ConvertFrom-Json; $cfg.printerName = '%PRINTER_CHOICE%'; $cfg | ConvertTo-Json -Depth 4 | Set-Content 'config.json' -Encoding UTF8"

echo.
echo [OK] Configuration updated successfully!
echo Target Printer is now set to: %PRINTER_CHOICE%
echo.
echo Would you like to run a test print now? (Y/N)
set /p DO_TEST="Choice: "

if /i "%DO_TEST%"=="Y" (
    call test-print.bat
)

echo.
echo Setup complete. Press any key to exit...
pause >nul

