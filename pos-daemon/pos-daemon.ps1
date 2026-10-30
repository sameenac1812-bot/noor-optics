<#
.SYNOPSIS
    pos-daemon/pos-daemon.ps1 – Native Windows PowerShell POS Print Engine
    Zero-dependency thermal print daemon for Windows 10/11.
    Provides identical HTTP endpoints and ESC/POS formatting as pos-daemon.js.
#>

[CmdletBinding()]
param(
    [int]$Port = 5001,
    [string]$PrinterName = "POS-80"
)

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$ConfigFile = Join-Path $ScriptDir "config.json"
$HistoryFile = Join-Path $ScriptDir ".printed_orders.json"
$LogsDir = Join-Path $ScriptDir "logs"
$WorkerScript = Join-Path $ScriptDir "worker-printer.ps1"

if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null }

# Load Configuration
$Config = @{
    port = $Port
    printerName = $PrinterName
    paperWidthInch = 2.5
    columns = 32
    storeName = "NOOR OPTICS"
    storeTagline = "Scandinavian Eyewear Boutique"
    storeAddress = "Indiranagar 100ft Road, Bengaluru"
    storePhone = "+91 98765 43210"
    storeGstin = "29AAAAA0000A1Z5"
}

if (Test-Path $ConfigFile) {
    try {
        $json = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        if ($json.port) { $Config.port = [int]$json.port }
        if ($json.printerName) { $Config.printerName = [string]$json.printerName }
        if ($json.storeName) { $Config.storeName = [string]$json.storeName }
        if ($json.storeAddress) { $Config.storeAddress = [string]$json.storeAddress }
        if ($json.storePhone) { $Config.storePhone = [string]$json.storePhone }
    } catch {}
}

# Load Print History
$History = @{}
if (Test-Path $HistoryFile) {
    try {
        $rawH = Get-Content $HistoryFile -Raw | ConvertFrom-Json
        $rawH.psobject.properties | ForEach-Object { $History[$_.Name] = $_.Value }
    } catch {}
}

function Save-History {
    try {
        $History | ConvertTo-Json -Depth 4 | Set-Content $HistoryFile -Encoding UTF8
    } catch {}
}

function Write-DaemonLog($msg, $level = "INFO") {
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[$ts] [$level] $msg"
    Write-Host $line
    try {
        $today = (Get-Date).ToString("yyyy-MM-dd")
        $logPath = Join-Path $LogsDir "daemon_ps_$today.log"
        Add-Content -Path $logPath -Value $line -Encoding UTF8
    } catch {}
}

# Format 2.5-Inch (32 Column) ESC/POS Receipt
function Format-ReceiptBytes($order) {
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)

    $COLS = 32
    $divider = ("-" * $COLS) + "`n"
    $doubleDivider = ("=" * $COLS) + "`n"

    function Center-Text($txt) {
        $s = [string]$txt
        if ($s.Length -gt $COLS) { $s = $s.Substring(0, $COLS) }
        $pad = [Math]::Max(0, [int][Math]::Floor(($COLS - $s.Length) / 2))
        return (" " * $pad) + $s + "`n"
    }

    function Row-Text($left, $right) {
        $r = [string]$right
        $maxL = [Math]::Max(0, $COLS - $r.Length - 1)
        $l = [string]$left
        if ($l.Length -gt $maxL) { $l = $l.Substring(0, $maxL) }
        $space = [Math]::Max(1, $COLS - $l.Length - $r.Length)
        return $l + (" " * $space) + $r + "`n"
    }

    # 1. ESC @ (Initialize)
    $bw.Write([byte[]]@(0x1B, 0x40))

    # 1b. Print Noor Glasses Logo at Top
    $LogoRasterFile = Join-Path $ScriptDir "assets\logo_raster.bin"
    if (Test-Path $LogoRasterFile) {
        $logoBytes = [System.IO.File]::ReadAllBytes($LogoRasterFile)
        $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
        $bw.Write($logoBytes)
        $bw.Write([byte[]]@(0x1B, 0x64, 0x01)) # Feed 1 line
    }

    # 2. Header (NO City, NO GSTIN)
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([byte[]]@(0x1D, 0x21, 0x01)) # Double height
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("$($Config.storeName)`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("$($Config.storeTagline)`n"))
    $cleanAddr = "$($Config.storeAddress)" -replace ",\s*Bengaluru", "" -replace "Bengaluru", ""
    if ($cleanAddr) { $bw.Write([System.Text.Encoding]::ASCII.GetBytes("$cleanAddr`n")) }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Ph: $($Config.storePhone)`n"))
    # GSTIN removed
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($doubleDivider))

    # 3. Invoice & Token
    $bw.Write([byte[]]@(0x1B, 0x61, 0x00)) # Left
    $tok = if ($order.token_number) { $order.token_number } elseif ($order.token) { $order.token } else { 1 }
    $chn = if ($order.channel) { $order.channel.ToUpper() } else { "IN-STORE" }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "TOKEN #$tok" "[$chn]")))
    $ref = if ($order.order_number) { $order.order_number } elseif ($order.order_ref) { $order.order_ref } else { "NOOR-INV" }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Invoice:" $ref)))
    $dateStr = (Get-Date).ToString("dd MMM yyyy, hh:mm tt")
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Date:" $dateStr)))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 4. Customer (NO CITY)
    $cName = if ($order.customer_name) { $order.customer_name } else { "Walk-in Client" }
    $cPhone = if ($order.customer_phone) { $order.customer_phone } else { "-" }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Client: $cName`n"))
    if ($cPhone -ne "-") { $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Phone:  $cPhone`n")) }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 5. Items
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "ITEM / SPEC" "QTY  AMOUNT")))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    if ($order.items -and $order.items.Count -gt 0) {
        foreach ($it in $order.items) {
            $name = if ($it.product_name) { $it.product_name } elseif ($it.name) { $it.name } else { "Frame" }
            $qty = if ($it.quantity) { [int]$it.quantity } else { 1 }
            $price = if ($it.unit_price_inr) { [double]$it.unit_price_inr } elseif ($it.unitPrice) { [double]$it.unitPrice } else { 0 }
            $tot = if ($it.subtotal_inr) { [double]$it.subtotal_inr } else { $price * $qty }

            $line = Row-Text $name.Substring(0, [Math]::Min(18, $name.Length)) "$qty  Rs.$([Math]::Round($tot))"
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($line))
            if ($it.variant_name) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Color: $($it.variant_name)`n"))
            }
        }
    } else {
        $grand = if ($order.total_payable_inr) { [double]$order.total_payable_inr } elseif ($order.grand_total) { [double]$order.grand_total } else { 4299 }
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Optical Frame" "1  Rs.$([Math]::Round($grand))")))
    }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 6. Totals (NO GST / NO GSTIN / NO TAX lines)
    $sub = if ($order.subtotal_inr) { [double]$order.subtotal_inr } elseif ($order.subtotal) { [double]$order.subtotal } else { 4299 }
    $disc = if ($order.discount_inr) { [double]$order.discount_inr } elseif ($order.discount) { [double]$order.discount } else { 0 }
    $grandT = if ($order.total_payable_inr) { [double]$order.total_payable_inr } elseif ($order.grand_total) { [double]$order.grand_total } else { $sub }
    $paid = if ($order.amount_paid_inr) { [double]$order.amount_paid_inr } else { $grandT }
    $bal = [Math]::Max(0, $grandT - $paid)
    $paym = if ($order.payment_method) { $order.payment_method.ToUpper() } else { "CASH" }

    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Subtotal:" "Rs.$([Math]::Round($sub))")))
    if ($disc -gt 0) {
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Discount:" "-Rs.$([Math]::Round($disc))")))
    }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($doubleDivider))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "GRAND TOTAL:" "Rs.$([Math]::Round($grandT))")))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Payment [$paym]:" "Rs.$([Math]::Round($paid))")))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Balance Due:" (if ($bal -gt 0) { "Rs.$([Math]::Round($bal))" } else { "Rs.0 (PAID)" }))))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 7. Prescription if attached
    $rx = if ($order.prescription) { $order.prescription } elseif ($order.newPrescription) { $order.newPrescription } else { $order }
    $odSphV = if ($rx.od_sph -ne $null -and $rx.od_sph -ne '') { $rx.od_sph } else { $order.od_sph }
    $osSphV = if ($rx.os_sph -ne $null -and $rx.os_sph -ne '') { $rx.os_sph } else { $order.os_sph }
    $hasRx = ($odSphV -ne $null -and $odSphV -ne '') -or ($osSphV -ne $null -and $osSphV -ne '') -or $rx.prescription_number -or $order.prescription_number -or $order.prescription_id -or ($order.prescription_pref -and $order.prescription_pref -match 'rx')

    if ($hasRx) {
        $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
        $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--- CLIENT PRESCRIPTION (RX) ---`n"))
        $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
        $bw.Write([byte[]]@(0x1B, 0x61, 0x00))

        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Eye    SPH    CYL   AXIS   ADD  `n"))
        $odS = "{0:+0.00;-0.00; 0.00}" -f [double]($odSphV)
        $odC = "{0:+0.00;-0.00; 0.00}" -f [double](if ($rx.od_cyl -ne $null) { $rx.od_cyl } else { $order.od_cyl })
        $odA = "{0,3}" -f (if ($rx.od_axis -ne $null) { $rx.od_axis } else { $order.od_axis })
        $add = "{0:+0.00;-0.00; 0.00}" -f [double](if ($rx.addition -ne $null) { $rx.addition } else { $order.addition })
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OD   $odS  $odC   $odA  $add`n"))

        $osS = "{0:+0.00;-0.00; 0.00}" -f [double]($osSphV)
        $osC = "{0:+0.00;-0.00; 0.00}" -f [double](if ($rx.os_cyl -ne $null) { $rx.os_cyl } else { $order.os_cyl })
        $osA = "{0,3}" -f (if ($rx.os_axis -ne $null) { $rx.os_axis } else { $order.os_axis })
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OS   $osS  $osC   $osA  $add`n"))
        $pdVal = if ($rx.ipd_distance) { $rx.ipd_distance } elseif ($rx.pd) { $rx.pd } elseif ($order.ipd_distance) { $order.ipd_distance } else { $order.pd }
        if ($pdVal) {
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Distance PD: $pdVal mm`n"))
        }
        $docVal = if ($rx.checked_by) { $rx.checked_by } elseif ($rx.rx_checked_by) { $rx.rx_checked_by } else { $order.checked_by }
        if ($docVal) {
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Optometrist: $docVal`n"))
        }
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
    }

    # 8. Crisp Anti-Blotting UPI Payment QR Code
    $QrRasterFile = Join-Path $ScriptDir "assets\payment_qr_raster.bin"
    if (Test-Path $QrRasterFile) {
        $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
        $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("SCAN & PAY VIA UPI`n"))
        $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
        $qrBytes = [System.IO.File]::ReadAllBytes($QrRasterFile)
        $bw.Write($qrBytes)
        $bw.Write([byte[]]@(0x1B, 0x64, 0x01))
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("UPI ID: 9182341567@mairtel`n"))
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
    }

    # 9. Concluding Sign-off (Everything under this removed as requested)
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Thank You for Choosing Noor!`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off

    # 10. Feed & Cut
    $bw.Write([byte[]]@(0x1B, 0x64, 0x04)) # Feed 4 lines
    $bw.Write([byte[]]@(0x1D, 0x56, 0x42, 0x00)) # Partial cut

    $bytes = $ms.ToArray()
    $bw.Close()
    $ms.Close()
    return $bytes
}

function Spool-Bytes($bytes, $docName = "POS Bill") {
    $tempFile = Join-Path $LogsDir "ps_spool_$([Guid]::NewGuid().ToString().Substring(0,8)).bin"
    [System.IO.File]::WriteAllBytes($tempFile, $bytes)
    $output = & powershell.exe -ExecutionPolicy Bypass -NoProfile -File $WorkerScript -FilePath $tempFile -PrinterName $Config.printerName -DocName $docName
    $code = $LASTEXITCODE
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
    return ($code -eq 0)
}

# Start HTTP Listener
$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$($Config.port)/"
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
} catch {
    Write-DaemonLog "Could not bind to ${prefix}: $($_.Exception.Message). Another process may be running on port $($Config.port)." "FATAL"
    exit 1
}

Write-DaemonLog "======================================================="
Write-DaemonLog "NOOR OPTICS - POWERSHELL POS PRINT DAEMON v2.4.0"
Write-DaemonLog "Listening on $prefix"
Write-DaemonLog "Target Printer: '$($Config.printerName)' (2.5 Inch Paper Width)"
Write-DaemonLog "Mode: Single Customer Bill"
Write-DaemonLog "======================================================="

$running = $true
while ($running) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $origin = if ($request.Headers["Origin"]) { $request.Headers["Origin"] } else { "*" }
        $response.AddHeader("Access-Control-Allow-Origin", $origin)
        $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

        if ($request.HttpMethod -eq "OPTIONS") {
            $response.StatusCode = 204
            $response.Close()
            continue
        }

        $path = $request.Url.AbsolutePath

        # 1. GET /api/status
        if ($request.HttpMethod -eq "GET" -and $path -eq "/api/status") {
            $statusObj = @{
                status = "online"
                version = "2.4.0"
                engine = "PowerShell"
                printer = $Config.printerName
                paperWidthInch = 2.5
                columns = 32
                printKOT = $false
            }
            $buf = [System.Text.Encoding]::UTF8.GetBytes(($statusObj | ConvertTo-Json))
            $response.ContentType = "application/json"
            $response.ContentLength64 = $buf.Length
            $response.OutputStream.Write($buf, 0, $buf.Length)
            $response.Close()
            continue
        }

        # 2. POST /api/print
        if ($request.HttpMethod -eq "POST" -and $path -eq "/api/print") {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $payload = $body | ConvertFrom-Json
            $order = if ($payload.order) { $payload.order } else { $payload }
            $orderRef = if ($order.order_number) { $order.order_number } elseif ($order.order_ref) { $order.order_ref } else { $order.id }

            if ($History.ContainsKey($orderRef) -and -not $payload.manualReprint) {
                $resObj = @{ success = $true; skippedDuplicate = $true; orderNumber = $orderRef }
            } else {
                Write-DaemonLog "Printing 2.5-inch receipt for order #$orderRef..."
                $bytes = Format-ReceiptBytes $order
                $ok = Spool-Bytes $bytes "Bill-$orderRef"
                if ($ok) {
                    $History[$orderRef] = (Get-Date).ToString("o")
                    Save-History
                    $resObj = @{ success = $true; orderNumber = $orderRef }
                } else {
                    $resObj = @{ success = $false; error = "Spooler failure" }
                }
            }

            $buf = [System.Text.Encoding]::UTF8.GetBytes(($resObj | ConvertTo-Json))
            $response.ContentType = "application/json"
            $response.ContentLength64 = $buf.Length
            $response.OutputStream.Write($buf, 0, $buf.Length)
            $response.Close()
            continue
        }

        # 3. POST /api/test-print
        if ($request.HttpMethod -eq "POST" -and $path -eq "/api/test-print") {
            $sample = @{
                order_number = "TEST-PS-01"
                token_number = 99
                channel = "TEST"
                customer_name = "Test Client"
                customer_phone = "+91 99999 99999"
                subtotal_inr = 4299
                total_payable_inr = 4299
                amount_paid_inr = 4299
                od_sph = -1.50; od_cyl = -0.50; od_axis = 90; addition = 1.50
                os_sph = -1.75; os_cyl = -0.25; os_axis = 80; ipd_distance = 63
            }
            $bytes = Format-ReceiptBytes $sample
            $ok = Spool-Bytes $bytes "Test-Receipt"
            $resObj = @{ success = $ok; message = if ($ok) { "Test receipt printed!" } else { "Spooler failed" } }
            $buf = [System.Text.Encoding]::UTF8.GetBytes(($resObj | ConvertTo-Json))
            $response.ContentType = "application/json"
            $response.ContentLength64 = $buf.Length
            $response.OutputStream.Write($buf, 0, $buf.Length)
            $response.Close()
            continue
        }

        # Default 404
        $response.StatusCode = 404
        $response.Close()
    } catch {
        Write-DaemonLog "Request loop error: $_" "ERROR"
    }
}

$listener.Stop()
