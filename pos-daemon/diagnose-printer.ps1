# diagnose-printer.ps1 - Thermal Printer Diagnostic & Fix Tool
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ConfigFile = Join-Path $ScriptDir "config.json"

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "       NOOR OPTICS - THERMAL PRINTER DIAGNOSTIC & FIX WIZARD         " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "--- 1. SCANNING INSTALLED PRINTERS & PORTS ---" -ForegroundColor Yellow
$printers = @()
try {
    $printers += @(Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue | Select-Object Name, PortName, DriverName, Default, WorkOffline)
} catch {
    $printers += @(Get-WmiObject -Class Win32_Printer -ErrorAction SilentlyContinue | Select-Object Name, PortName, DriverName, Default, WorkOffline)
}

if ($printers.Count -eq 0) {
    Write-Host "[!] NO PRINTERS FOUND on this computer!" -ForegroundColor Red
} else {
    $printers | Format-Table -AutoSize Name, PortName, DriverName, Default, WorkOffline
}

Write-Host "--- 2. CHECKING FOR FROZEN / STUCK PRINT JOBS ---" -ForegroundColor Yellow
$stuckCount = 0
try {
    $spoolFiles = Get-ChildItem "$env:SystemRoot\System32\spool\PRINTERS\*.*" -ErrorAction SilentlyContinue
    $stuckCount = if ($spoolFiles) { $spoolFiles.Count } else { 0 }
} catch {}

if ($stuckCount -gt 0) {
    Write-Host "[ALERT] Found $stuckCount file(s) in Windows Spooler queue!" -ForegroundColor Red
    Write-Host "A stuck print job BLOCKS all new receipts from printing." -ForegroundColor Red
} else {
    Write-Host "[OK] Windows Print Spooler queue is clean (0 stuck jobs)." -ForegroundColor Green
}

$targetName = "POS-80"
if (Test-Path $ConfigFile) {
    try {
        $cfg = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        if ($cfg.printerName) { $targetName = $cfg.printerName }
    } catch {}
}

Write-Host "`n--- 3. DAEMON CONFIGURATION ---" -ForegroundColor Yellow
Write-Host "Target Printer configured: '$targetName'" -ForegroundColor Cyan

$matched = $printers | Where-Object { $_.Name -eq $targetName }
if (-not $matched) {
    Write-Host "[WARNING] Printer '$targetName' is NOT installed in Windows under this exact name!" -ForegroundColor Red
    Write-Host "Run setup-printer.bat to select the exact printer name from the list above." -ForegroundColor Yellow
} else {
    Write-Host "[OK] Printer '$targetName' is installed in Windows on port: $($matched.PortName)" -ForegroundColor Green
    if ($matched.PortName -match "LPT|COM|nul") {
        Write-Host "[CRITICAL ISSUE] Port is '$($matched.PortName)'! Thermal USB printers must use USB001/USB002." -ForegroundColor Red
        Write-Host "Go to Windows Printer Properties -> Ports -> change to USB001." -ForegroundColor Yellow
    }
    if ($matched.WorkOffline) {
        Write-Host "[CRITICAL ISSUE] Printer is set to 'Work Offline' in Windows!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "OPTIONS:"
Write-Host "  [1] Send Instant Test Print to '$targetName'"
Write-Host "  [2] Clear Frozen Windows Print Queue (Force Restart Spooler)"
Write-Host "  [3] Pick / Change Printer Name (setup-printer.bat)"
Write-Host "  [4] Exit"
Write-Host "======================================================================" -ForegroundColor Cyan

$choice = Read-Host "Enter Choice (1-4)"

if ($choice -eq "1") {
    & powershell.exe -ExecutionPolicy Bypass -NoProfile -File (Join-Path $ScriptDir "test-print.ps1")
} elseif ($choice -eq "2") {
    Write-Host "Stopping print spooler and clearing queue..." -ForegroundColor Cyan
    try {
        Stop-Service -Name Spooler -Force -ErrorAction SilentlyContinue
        Remove-Item "$env:SystemRoot\System32\spool\PRINTERS\*.*" -Force -ErrorAction SilentlyContinue
        Start-Service -Name Spooler -ErrorAction SilentlyContinue
        Write-Host "[OK] Windows Print Spooler cleared and restarted successfully!" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Administrator permissions required to restart spooler service." -ForegroundColor Red
    }
} elseif ($choice -eq "3") {
    & cmd.exe /c (Join-Path $ScriptDir "setup-printer.bat")
}

