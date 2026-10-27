@echo off
title Noor Optics - Printer Diagnostic and Test Print
cd /d "%~dp0"

echo ============================================================
echo     Noor Optics - PRINTER DIAGNOSTIC AND TEST PRINT     
echo ============================================================
echo   Running diagnostic on this PC...
echo.

powershell.exe -ExecutionPolicy Bypass -NoProfile -Command ^
  "Write-Host '[1] Clearing any stale spooler backlog...' -ForegroundColor Cyan; " ^
  "try { $old = Get-PrintJob -PrinterName 'POS-80' -ErrorAction SilentlyContinue | Where-Object { ($_.SubmittedTime -and ((Get-Date) - $_.SubmittedTime).TotalHours -gt 1) -or $_.JobStatus -match 'Error|Retained|UserIntervention' }; if ($old) { $old | Remove-PrintJob -ErrorAction SilentlyContinue; Write-Host ('   Cleaned ' + $old.Count + ' stale print jobs.') -ForegroundColor Green } else { Write-Host '   Print queue is clean.' -ForegroundColor Green } } catch {}; " ^
  "Write-Host '[2] Hardware USB Device Detection:' -ForegroundColor Cyan; " ^
  "$dev = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { ($_.FriendlyName -match 'POS-80|Thermal' -or $_.InstanceId -like '*0483*') }; " ^
  "if ($dev) { " ^
  "  $online = ($dev | Where-Object { $_.Present -eq $true }).Count -gt 0; " ^
  "  if ($online) { Write-Host '   [OK] Thermal Printer Hardware is Connected & Powered On' -ForegroundColor Green } " ^
  "  else { Write-Host '   [ATTENTION] Printer USB is registered but currently DISCONNECTED or POWER SWITCH IS OFF!' -ForegroundColor Magenta; Write-Host '   -> Please flip ON the power switch on printer and ensure USB cable is plugged into PC.' -ForegroundColor Yellow } " ^
  "} else { Write-Host '   No specific thermal USB hardware detected.' -ForegroundColor Gray }; " ^
  "Write-Host '[3] Printers installed in Windows:' -ForegroundColor Cyan; " ^
  "$printers = @(); " ^
  "try { $printers = Get-Printer -ErrorAction SilentlyContinue } catch {}; " ^
  "if (-not $printers) { try { $printers = Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue } catch {} }; " ^
  "if ($printers) { " ^
  "  $printers | Select-Object Name, DriverName, PortName, PrinterStatus | Format-Table -AutoSize; " ^
  "} else { " ^
  "  Write-Host '   No printers found in Windows yet!' -ForegroundColor Yellow; " ^
  "}; " ^
  "Write-Host '[4] Sending Test Print to POS-80...' -ForegroundColor Cyan; " ^
  "& '.\print-order.ps1' -OrderFile 'sample-order.json'"

echo.
echo ============================================================
echo  - If bill printed: You are ready! Run 'start-pos.bat'
echo  - If printer not detected: Run 'setup-printer.bat' as Admin
echo ============================================================
echo.
pause
