@echo off
setlocal enabledelayedexpansion
title Noor Optics - 2.5-Inch Thermal Test Print
color 0A

echo ======================================================================
echo           NOOR OPTICS - 2.5-INCH THERMAL RECEIPT TEST
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/2] Generating 2.5-inch 32-column test receipt payload...

powershell -Command "
$cfg = Get-Content 'config.json' -Raw | ConvertFrom-Json
$pName = if ($cfg.printerName) { $cfg.printerName } else { 'POS-80' }

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# Reset
$bw.Write([byte[]]@(0x1B, 0x40))

# 1. Logo at Top
$logoFile = Join-Path $PSScriptRoot 'assets\logo_raster.bin'
if (Test-Path $logoFile) {
    $logoBytes = [System.IO.File]::ReadAllBytes($logoFile)
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
    $bw.Write($logoBytes)
    $bw.Write([byte[]]@(0x1B, 0x64, 0x01))
}

# 2. Store Header (NO City, NO GSTIN)
$bw.Write([byte[]]@(0x1B, 0x61, 0x01))
$bw.Write([byte[]]@(0x1B, 0x45, 0x01))
$bw.Write([byte[]]@(0x1D, 0x21, 0x01))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('NOOR OPTICS`n'))
$bw.Write([byte[]]@(0x1D, 0x21, 0x00))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Scandinavian Eyewear Boutique`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Indiranagar 100ft Road`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Ph: +91 98765 43210`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('================================`n'))

# 3. Order info
$bw.Write([byte[]]@(0x1B, 0x61, 0x00))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('TOKEN #99           [TEST PRINT]`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Invoice: NOOR-TEST-001`n'))
$dateStr = (Get-Date).ToString('dd MMM yyyy, hh:mm tt')
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Date:    ' + $dateStr + '`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('--------------------------------`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Customer: Test Walk-in Client`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Phone:    +91 99999 99999`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('--------------------------------`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('ITEM / SPEC          QTY  AMOUNT`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('--------------------------------`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('The Amber Arch         1  Rs.4,299`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes(' Color: Mazzucchelli Honey`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes(' Lens: Blue-Light Filter`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('--------------------------------`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Subtotal:               Rs.4,299`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('================================`n'))
$bw.Write([byte[]]@(0x1B, 0x45, 0x01))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('GRAND TOTAL:            Rs.4,299`n'))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Payment [CASH]:         Rs.4,299`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Balance Due:        Rs.0 (PAID)`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('--------------------------------`n'))
$bw.Write([byte[]]@(0x1B, 0x61, 0x01))
$bw.Write([byte[]]@(0x1B, 0x45, 0x01))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('--- CLIENT PRESCRIPTION (RX) ---`n'))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00))
$bw.Write([byte[]]@(0x1B, 0x61, 0x00))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Eye    SPH    CYL   AXIS   ADD  `n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('OD   -1.50  -0.50    90  +1.50  `n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('OS   -1.75  -0.25    80  +1.50  `n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Distance PD: 63 mm`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Optometrist: Licensed Optom`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('--------------------------------`n'))
$bw.Write([byte[]]@(0x1B, 0x61, 0x01))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Thank You for Choosing Noor!`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('2-Yr Frame Warranty • 14-Day Fit`n'))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes('Visit Again • nooroptics.in`n'))

# 4. Payment QR Code at Bottom
$qrFile = Join-Path $PSScriptRoot 'assets\payment_qr_raster.bin'
if (Test-Path $qrFile) {
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes('--------------------------------`n'))
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes('SCAN & PAY VIA UPI`n'))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
    $qrBytes = [System.IO.File]::ReadAllBytes($qrFile)
    $bw.Write($qrBytes)
    $bw.Write([byte[]]@(0x1B, 0x64, 0x01))
}
$bw.Write([byte[]]@(0x1B, 0x64, 0x04)) # Feed 4 lines
$bw.Write([byte[]]@(0x1D, 0x56, 0x42, 0x00)) # Partial Cut

$bytes = $ms.ToArray()
$bw.Close()
$ms.Close()

$temp = Join-Path $env:TEMP 'noor_test_receipt.bin'
[System.IO.File]::WriteAllBytes($temp, $bytes)

Write-Host '[2/2] Spooling test receipt to printer' $pName '...'
$res = & powershell.exe -ExecutionPolicy Bypass -NoProfile -File worker-printer.ps1 -FilePath $temp -PrinterName $pName -DocName 'Noor Test Receipt'
Remove-Item $temp -Force -ErrorAction SilentlyContinue
Write-Host $res
"

echo.
echo Test completed. Press any key to exit...
pause >nul

