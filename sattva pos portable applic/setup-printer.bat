@echo off
title Sattva Tiffins - Printer Driver Setup Helper
cd /d "%~dp0"

echo ============================================================
echo        SATTVA TIFFINS - PRINTER CONFIGURATION HELPER        
echo ============================================================
echo.
echo [1] Checking currently installed printers on this machine:
echo ------------------------------------------------------------
powershell.exe -NoProfile -Command "Get-Printer -ErrorAction SilentlyContinue | Select-Object Name, DriverName, PortName | Format-Table -AutoSize"
echo ------------------------------------------------------------
echo.
echo [2] Checking detected USB Printer Ports:
echo ------------------------------------------------------------
powershell.exe -NoProfile -Command "$ports = Get-PrinterPort -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'USB*' }; if ($ports) { $ports | Select-Object Name, Description | Format-Table -AutoSize } else { Write-Host 'No USB printer ports found yet. Make sure printer USB cable is plugged in and powered on!' -ForegroundColor Yellow }"
echo ------------------------------------------------------------
echo.
echo Choose an option (Run as Administrator if adding a printer):
echo   [1] Auto-Detect USB Port and Setup 'POS-80'
echo   [2] Manually install 'POS-80' on USB001
echo   [3] Manually install 'POS-80' on USB002
echo   [4] Run Immediate Test Print
echo   [5] Exit
echo.
set /p choice="Enter choice (1-5): "

if "%choice%"=="1" (
    powershell.exe -ExecutionPolicy Bypass -NoProfile -Command "$port = (Get-PrinterPort -ErrorAction SilentlyContinue | Where-Object { $_.Name -like 'USB*' } | Select-Object -First 1).Name; if (-not $port) { $port = 'USB001' }; Write-Host \"Configuring POS-80 on port $port...\" -ForegroundColor Cyan; try { Add-Printer -Name 'POS-80' -DriverName 'Generic / Text Only' -PortName $port -ErrorAction Stop; Write-Host \"SUCCESS: POS-80 created on port $port!\" -ForegroundColor Green } catch { Write-Host \"Notice: $($_.Exception.Message)\" -ForegroundColor Yellow; Write-Host 'Tip: Right-click setup-printer.bat and choose Run as Administrator.' -ForegroundColor Yellow }"
)
if "%choice%"=="2" (
    powershell.exe -ExecutionPolicy Bypass -NoProfile -Command "try { Add-Printer -Name 'POS-80' -DriverName 'Generic / Text Only' -PortName 'USB001' -ErrorAction Stop; Write-Host 'SUCCESS: POS-80 created on USB001!' -ForegroundColor Green } catch { Write-Host \"Notice: $($_.Exception.Message)\" -ForegroundColor Yellow; Write-Host 'Tip: Run as Administrator.' -ForegroundColor Yellow }"
)
if "%choice%"=="3" (
    powershell.exe -ExecutionPolicy Bypass -NoProfile -Command "try { Add-Printer -Name 'POS-80' -DriverName 'Generic / Text Only' -PortName 'USB002' -ErrorAction Stop; Write-Host 'SUCCESS: POS-80 created on USB002!' -ForegroundColor Green } catch { Write-Host \"Notice: $($_.Exception.Message)\" -ForegroundColor Yellow; Write-Host 'Tip: Run as Administrator.' -ForegroundColor Yellow }"
)
if "%choice%"=="4" (
    powershell.exe -ExecutionPolicy Bypass -NoProfile -File "print-order.ps1" -OrderFile "sample-order.json"
)

echo.
pause
