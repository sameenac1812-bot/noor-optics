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

if (-not (Test-Path $LogsDir)) { New-Item -ItemType Directory -Path $LogsDir -Force | Out-Null }

# Compile Direct Win32 Spooler P/Invoke once in memory
$win32Code = @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelperDirect {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public class DOCINFOA {
        [MarshalAs(UnmanagedType.LPStr)] public string pDocName;
        [MarshalAs(UnmanagedType.LPStr)] public string pOutputFile;
        [MarshalAs(UnmanagedType.LPStr)] public string pDataType;
    }

    [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);

    [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool ClosePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartDocPrinter(IntPtr hPrinter, int level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

    [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndDocPrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool StartPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool EndPagePrinter(IntPtr hPrinter);

    [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
    public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

    public static bool SendBytesToPrinter(string szPrinterName, byte[] bytes, string szDocName) {
        if (string.IsNullOrEmpty(szPrinterName)) return false;
        string cleanName = szPrinterName.Trim();
        IntPtr hPrinter = IntPtr.Zero;

        DOCINFOA di = new DOCINFOA();
        di.pDocName = string.IsNullOrEmpty(szDocName) ? "POS Thermal Receipt" : szDocName;
        di.pDataType = "RAW";

        if (!OpenPrinter(cleanName, out hPrinter, IntPtr.Zero)) return false;

        if (!StartDocPrinter(hPrinter, 1, di)) {
            di.pDataType = null;
            if (!StartDocPrinter(hPrinter, 1, di)) {
                ClosePrinter(hPrinter);
                return false;
            }
        }

        if (!StartPagePrinter(hPrinter)) { EndDocPrinter(hPrinter); ClosePrinter(hPrinter); return false; }

        IntPtr pUnmanagedBytes = Marshal.AllocCoTaskMem(bytes.Length);
        Marshal.Copy(bytes, 0, pUnmanagedBytes, bytes.Length);

        int dwWritten = 0;
        bool bSuccess = WritePrinter(hPrinter, pUnmanagedBytes, bytes.Length, out dwWritten);
        Marshal.FreeCoTaskMem(pUnmanagedBytes);

        EndPagePrinter(hPrinter);
        EndDocPrinter(hPrinter);
        ClosePrinter(hPrinter);
        return bSuccess;
    }
}
"@

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelperDirect').Type) {
    Add-Type -TypeDefinition $win32Code
}

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

# Auto-Detect POS Printer
try {
    $installed = @()
    try { $installed += @(Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name) } catch {}
    if ($installed.Count -eq 0) { try { $installed += @(Get-Printer | Select-Object -ExpandProperty Name) } catch {} }

    if ($installed -notcontains $Config.printerName) {
        $autoMatch = $installed | Where-Object { $_ -match "POS|Thermal|Receipt|58|80|XP|Text Only|Generic|RP|Everycom|TVS" } | Select-Object -First 1
        if ($autoMatch) {
            Write-Host "[Auto-Detect] Switched printer to connected POS device: '$autoMatch'" -ForegroundColor Green
            $Config.printerName = $autoMatch
        }
    }
} catch {}

# Load Print History
$History = @{}
if (Test-Path $HistoryFile) {
    try {
        $rawH = Get-Content $HistoryFile -Raw | ConvertFrom-Json
        $rawH.psobject.properties | ForEach-Object { $History[$_.Name] = $_.Value }
    } catch {}
}

# Auto-detect printer if configured printer is not found
try {
    $installed = Get-Printer | Select-Object -ExpandProperty Name
    if ($installed -notcontains $Config.printerName) {
        $auto = $installed | Where-Object { $_ -match 'POS|Thermal|Receipt|58|80|XP|Text Only|Generic|RP|Everycom|TVS' } | Select-Object -First 1
        if ($auto) {
            Write-Host "[Auto-Detect] Target '$($Config.printerName)' not found. Automatically connected to: '$auto'" -ForegroundColor Yellow
            $Config.printerName = $auto
        }
    }
} catch {}

function Save-History {
    try {
        $History | ConvertTo-Json -Depth 4 | Set-Content $HistoryFile -Encoding UTF8
    } catch {}
}

# Auto-detect printer if configured printer is not found
try {
    $installed = Get-Printer | Select-Object -ExpandProperty Name
    if ($installed -notcontains $Config.printerName) {
        $auto = $installed | Where-Object { $_ -match 'POS|Thermal|Receipt|58|80|XP|Text Only|Generic|RP|Everycom|TVS' } | Select-Object -First 1
        if ($auto) {
            Write-Host "[Auto-Detect] Target '$($Config.printerName)' not found. Automatically connected to: '$auto'" -ForegroundColor Yellow
            $Config.printerName = $auto
        }
    }
} catch {}

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

# Auto-detect printer if configured printer is not found
try {
    $installed = Get-Printer | Select-Object -ExpandProperty Name
    if ($installed -notcontains $Config.printerName) {
        $auto = $installed | Where-Object { $_ -match 'POS|Thermal|Receipt|58|80|XP|Text Only|Generic|RP|Everycom|TVS' } | Select-Object -First 1
        if ($auto) {
            Write-Host "[Auto-Detect] Target '$($Config.printerName)' not found. Automatically connected to: '$auto'" -ForegroundColor Yellow
            $Config.printerName = $auto
        }
    }
} catch {}

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
    try {
        $p = $Config.printerName
        Write-DaemonLog "Direct Spooling $($bytes.Length) bytes to '$p'..."
        $ok = [RawPrinterHelperDirect]::SendBytesToPrinter($p, $bytes, $docName)
        if (-not $ok) {
            $installed = @()
            try { $installed += @(Get-CimInstance Win32_Printer | Select-Object -ExpandProperty Name) } catch {}
            $alt = $installed | Where-Object { $_ -match "POS|Thermal|Receipt|58|80|XP|Text Only|Generic|RP|Everycom|TVS" } | Select-Object -First 1
            if ($alt -and $alt -ne $p) {
                Write-DaemonLog "Primary failed. Retrying with fallback: '$alt'..."
                $ok = [RawPrinterHelperDirect]::SendBytesToPrinter($alt, $bytes, $docName)
                if ($ok) { $Config.printerName = $alt }
            }
        }
        return $ok
    } catch {
        Write-DaemonLog "Spool exception: $_" "ERROR"
        return $false
    }
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

        # 2b. POST /api/printer/print-qr-sticker or /api/print-qr-sticker
        if ($request.HttpMethod -eq "POST" -and ($path -eq "/api/printer/print-qr-sticker" -or $path -eq "/api/print-qr-sticker")) {
            $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $payload = $body | ConvertFrom-Json
            $rawItems = if ($payload.items) { $payload.items } else { @($payload) }
            Write-DaemonLog "Received QR Sticker print request for $($rawItems.Count) frame(s)..."

            $allBuffers = New-Object System.IO.MemoryStream
            $allBw = New-Object System.IO.BinaryWriter($allBuffers)

            foreach ($item in $rawItems) {
                $sku = [string](if ($item.sku) { $item.sku } else { "NOOR-FRAME" }).ToUpper()
                $name = [string](if ($item.name) { $item.name } else { "" })
                if ($name.Length -gt 18) { $name = $name.Substring(0, 18) }
                $price = [string](if ($item.price) { $item.price } else { "" }).Trim()
                if ($price.StartsWith("₹")) { $price = "Rs. " + $price.Substring(1).Trim() }
                if ($price -and -not $price.ToUpper().StartsWith("RS") -and -not $price.ToUpper().StartsWith("M.R.P")) {
                    $price = "Rs. " + $price
                }
                $copies = [int](if ($item.copies) { $item.copies } elseif ($payload.copies) { $payload.copies } else { 1 })

                for ($c = 0; $c -lt $copies; $c++) {
                    $allBw.Write([byte[]]@(0x1B, 0x40)) # Reset
                    $allBw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
                    $allBw.Write([byte[]]@(0x1B, 0x33, 0x10)) # Tight line spacing (16 dots)

                    # ESC/POS Native 2D QR Code: GS ( k
                    $qrText = "HTTPS://NOOROPTICS.VERCEL.APP/Q/$sku"
                    $qrBytes = [System.Text.Encoding]::ASCII.GetBytes($qrText)
                    $len = $qrBytes.Length + 3
                    $pL = $len % 256
                    $pH = [Math]::Floor($len / 256)

                    # 1. Model (Model 2)
                    $allBw.Write([byte[]]@(0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00))
                    # 2. Module Size (3 dots per module = ~10mm small crisp QR!)
                    $allBw.Write([byte[]]@(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x03))
                    # 3. Error Correction Level L
                    $allBw.Write([byte[]]@(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x30))
                    # 4. Store Data
                    $allBw.Write([byte[]]@(0x1D, 0x28, 0x6B, $pL, $pH, 0x31, 0x50, 0x30))
                    $allBw.Write($qrBytes)
                    # 5. Print QR
                    $allBw.Write([byte[]]@(0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30))

                    # 6. Text strictly inside QR flag area: Font B
                    $allBw.Write([byte[]]@(0x1B, 0x4D, 0x01)) # Font B
                    $allBw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
                    $allBw.Write([System.Text.Encoding]::ASCII.GetBytes("$sku`n"))
                    $allBw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
                    if ($name) { $allBw.Write([System.Text.Encoding]::ASCII.GetBytes("$name`n")) }
                    if ($price) { $allBw.Write([System.Text.Encoding]::ASCII.GetBytes("$price`n")) }
                    $allBw.Write([byte[]]@(0x1B, 0x4D, 0x00)) # Font A
                    $allBw.Write([byte[]]@(0x1B, 0x32)) # Reset line spacing

                    $allBw.Write([byte[]]@(0x1B, 0x64, 0x01)) # Feed 1 line
                    $allBw.Write([byte[]]@(0x1D, 0x56, 0x42, 0x00)) # Partial cut
                }
            }

            $combined = $allBuffers.ToArray()
            $allBw.Close()
            $allBuffers.Close()

            $ok = Spool-Bytes $combined "QR-Sticker"
            $resObj = @{ success = $ok; count = $rawItems.Count; message = if ($ok) { "Sticker(s) printed successfully!" } else { "Spooler failure" } }
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
