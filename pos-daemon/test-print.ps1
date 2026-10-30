# test-print.ps1 - Noor Optics 2.5-Inch Receipt Test Print
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ConfigFile = Join-Path $ScriptDir "config.json"
$WorkerScript = Join-Path $ScriptDir "worker-printer.ps1"

Write-Host "======================================================================" -ForegroundColor Green
Write-Host "          NOOR OPTICS - 2.5-INCH THERMAL RECEIPT TEST PRINT           " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
Write-Host ""

$pName = "POS-80"
if (Test-Path $ConfigFile) {
    try {
        $cfg = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        if ($cfg.printerName) { $pName = $cfg.printerName }
    } catch {}
}

Write-Host "[1/2] Target Printer: '$pName'" -ForegroundColor Cyan
Write-Host "[1/2] Formatting 2.5-inch 32-column receipt payload..." -ForegroundColor Cyan

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# Reset
$bw.Write([byte[]]@(0x1B, 0x40))

# 1. Logo at Top
$logoFile = Join-Path $ScriptDir "assets\logo_raster.bin"
if (Test-Path $logoFile) {
    $logoBytes = [System.IO.File]::ReadAllBytes($logoFile)
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write($logoBytes)
}

# 2. Store Header (NOOR OPTIC, Pillar No. 45, Rethibowli, Hyderabad, Telangana 500028)
$bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([byte[]]@(0x1D, 0x21, 0x01)) # Double height
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("NOOR OPTIC`n"))
$bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Pillar No. 45, Rethibowli, Hyderabad, Telangana 500028`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Ph: +91 98765 43210`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))

# 3. Order Info
$bw.Write([byte[]]@(0x1B, 0x61, 0x00)) # Left
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("TOKEN #99           [TEST PRINT]`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Invoice: NOOR-TEST-001`n"))
$dateStr = (Get-Date).ToString("dd MMM yyyy, hh:mm tt")
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Date:    $dateStr`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Customer: Test Walk-in Client`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Phone:    +91 99999 99999`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("ITEM / SPEC          QTY  AMOUNT`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("The Amber Arch         1  Rs.4,299`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Color: Mazzucchelli Honey`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Lens: Blue-Light Filter`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Subtotal:               Rs.4,299`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("GRAND TOTAL:            Rs.4,299`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Payment [CASH]:         Rs.4,299`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Balance Due:        Rs.0 (PAID)`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))

# 4. Prescription Rx
$bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--- CLIENT PRESCRIPTION (RX) ---`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
$bw.Write([byte[]]@(0x1B, 0x61, 0x00)) # Left
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Eye    SPH    CYL   AXIS   ADD  `n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("OD   -1.50  -0.50    90  +1.50  `n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("OS   -1.75  -0.25    80  +1.50  `n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Distance PD: 63 mm`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Optometrist: Licensed Optom`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))

# 5. Payment QR Code
$qrFile = Join-Path $ScriptDir "assets\payment_qr_raster.bin"
if (Test-Path $qrFile) {
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("SCAN & PAY VIA UPI`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
    $qrBytes = [System.IO.File]::ReadAllBytes($qrFile)
    $bw.Write($qrBytes)
    $bw.Write([byte[]]@(0x1B, 0x64, 0x01)) # Feed 1 line
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("UPI ID: 9182341567@mairtel`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))
}

# 6. Sign-off
$bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Thank You for Choosing Noor!`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off

$bw.Write([byte[]]@(0x1B, 0x64, 0x03)) # Feed 3 lines
$bw.Write([byte[]]@(0x1D, 0x56, 0x42, 0x00)) # Partial cut

$bytes = $ms.ToArray()
$bw.Close()
$ms.Close()

$temp = Join-Path $env:TEMP "noor_test_receipt_$([Guid]::NewGuid().ToString().Substring(0,6)).bin"
[System.IO.File]::WriteAllBytes($temp, $bytes)

Write-Host "[2/2] Spooling to Windows Spooler for '$pName'..." -ForegroundColor Cyan
$output = & powershell.exe -ExecutionPolicy Bypass -NoProfile -File $WorkerScript -FilePath $temp -PrinterName $pName -DocName "Noor Test Receipt"
$exitCode = $LASTEXITCODE
Remove-Item $temp -Force -ErrorAction SilentlyContinue

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "[SUCCESS] $output" -ForegroundColor Green
    Write-Host "Receipt successfully transmitted to printer hardware!" -ForegroundColor Green
} else {
    Write-Host "[FAILED] $output" -ForegroundColor Red
    Write-Host "Please check USB cable, printer power switch, and Windows printer name." -ForegroundColor Yellow
}

