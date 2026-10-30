<#
.SYNOPSIS
    pos-daemon/print-order.ps1 - Command line order printing utility
    Reads JSON order file, formats 2.5-inch receipt and spools to thermal printer.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$OrderFile = "sample-order.json",

    [Parameter(Mandatory = $false)]
    [string]$PrinterName = "POS-80"
)

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not (Test-Path $OrderFile)) {
    $alt = Join-Path $ScriptDir $OrderFile
    if (Test-Path $alt) {
        $OrderFile = $alt
    }
}

if (-not (Test-Path $OrderFile)) {
    Write-Error "Order file not found: $OrderFile"
    exit 1
}

$raw = Get-Content $OrderFile -Raw | ConvertFrom-Json
$worker = Join-Path $ScriptDir "worker-printer.ps1"

# Generate ESC/POS receipt
$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

$COLS = 32
$divider = ("-" * $COLS) + "`n"
$doubleDivider = ("=" * $COLS) + "`n"

function Row-Text($left, $right) {
    $r = [string]$right
    $maxL = [Math]::Max(0, $COLS - $r.Length - 1)
    $l = [string]$left
    if ($l.Length -gt $maxL) { $l = $l.Substring(0, $maxL) }
    $space = [Math]::Max(1, $COLS - $l.Length - $r.Length)
    return $l + (" " * $space) + $r + "`n"
}

# 1. Reset
$bw.Write([byte[]]@(0x1B, 0x40))

# 1b. Logo at Top
$logoFile = Join-Path $ScriptDir "assets\logo_raster.bin"
if (Test-Path $logoFile) {
    $logoBytes = [System.IO.File]::ReadAllBytes($logoFile)
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
    $bw.Write($logoBytes)
    $bw.Write([byte[]]@(0x1B, 0x64, 0x01))
}

# 2. Header (NO City, NO GSTIN)
$bw.Write([byte[]]@(0x1B, 0x61, 0x01))
$bw.Write([byte[]]@(0x1B, 0x45, 0x01))
$bw.Write([byte[]]@(0x1D, 0x21, 0x01))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("NOOR OPTICS`n"))
$bw.Write([byte[]]@(0x1D, 0x21, 0x00))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Scandinavian Eyewear Boutique`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Indiranagar 100ft Road`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Ph: +91 98765 43210`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes($doubleDivider))

# 3. Info
$bw.Write([byte[]]@(0x1B, 0x61, 0x00))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "TOKEN #$($raw.token_number)" "[$($raw.channel)]")))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Invoice:" "$($raw.order_number)")))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Date:" (Get-Date).ToString("dd MMM yyyy, hh:mm tt"))))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

# 4. Customer (NO City)
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Client: $($raw.customer_name)`n"))
if ($raw.customer_phone) { $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Phone:  $($raw.customer_phone)`n")) }
$bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

# 5. Items
$bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "ITEM / SPEC" "QTY  AMOUNT")))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
foreach ($it in $raw.items) {
    $line = Row-Text $it.product_name "$($it.quantity)  Rs.$($it.subtotal_inr)"
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($line))
    if ($it.variant_name) { $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Color: $($it.variant_name)`n")) }
    if ($it.lens_name) { $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Lens: $($it.lens_name)`n")) }
}
$bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

# 6. Total (NO GST / NO Tax)
$bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Subtotal:" "Rs.$($raw.subtotal_inr)")))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes($doubleDivider))
$bw.Write([byte[]]@(0x1B, 0x45, 0x01))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "GRAND TOTAL:" "Rs.$($raw.total_payable_inr)")))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Payment [$($raw.payment_method)]:" "Rs.$($raw.amount_paid_inr)")))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

# 7. Rx
if ($raw.od_sph -ne $null) {
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--- CLIENT PRESCRIPTION (RX) ---`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
    $bw.Write([byte[]]@(0x1B, 0x61, 0x00))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Eye    SPH    CYL   AXIS   ADD  `n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OD   $($raw.od_sph)  $($raw.od_cyl)   $($raw.od_axis)  $($raw.addition)`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OS   $($raw.os_sph)  $($raw.os_cyl)   $($raw.os_axis)  $($raw.addition)`n"))
    if ($raw.ipd_distance) { $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Distance PD: $($raw.ipd_distance) mm`n")) }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
}

# 8. Crisp Anti-Blotting UPI Payment QR
$qrFile = Join-Path $ScriptDir "assets\payment_qr_raster.bin"
if (Test-Path $qrFile) {
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("SCAN & PAY VIA UPI`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
    $qrBytes = [System.IO.File]::ReadAllBytes($qrFile)
    $bw.Write($qrBytes)
    $bw.Write([byte[]]@(0x1B, 0x64, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("UPI ID: 9182341567@mairtel`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
}

# 9. Concluding Sign-off (Everything under this removed as requested)
$bw.Write([byte[]]@(0x1B, 0x61, 0x01))
$bw.Write([byte[]]@(0x1B, 0x45, 0x01))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Thank You for Choosing Noor!`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00))

# 10. Cut
$bw.Write([byte[]]@(0x1B, 0x64, 0x04))
$bw.Write([byte[]]@(0x1D, 0x56, 0x42, 0x00))

$bytes = $ms.ToArray()
$bw.Close()
$ms.Close()

$temp = Join-Path $env:TEMP "noor_cmd_print.bin"
[System.IO.File]::WriteAllBytes($temp, $bytes)

Write-Host "Spooling to printer $PrinterName..."
$res = & powershell.exe -ExecutionPolicy Bypass -NoProfile -File $worker -FilePath $temp -PrinterName $PrinterName -DocName "Noor Order Print"
Remove-Item $temp -Force -ErrorAction SilentlyContinue
Write-Host $res
