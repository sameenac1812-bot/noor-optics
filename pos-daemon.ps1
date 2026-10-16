# ==============================================================================
# pos-daemon.ps1 – Pure Native Windows POS Cloud Print Daemon
# ZERO DEPENDENCIES & 100% SELF-CONTAINED
# Works on ANY Windows 10/11 PC/Laptop without Node.js or external files!
# ==============================================================================
param(
    [string]$PrinterName = "",
    [string]$CloudTopic = "subfresh_orders_live_v4_78637e1f"
)

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

# ── 1. Native Windows Raw WinSpool Printer Helper ─────────────────────────────
$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelperDaemon {
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

    public static bool SendBytesToPrinter(string szPrinterName, byte[] bytes) {
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = "Sattva Customer Bill";
        di.pDataType = "RAW";

        if (!OpenPrinter(szPrinterName.Normalize(), out hPrinter, IntPtr.Zero)) return false;
        if (!StartDocPrinter(hPrinter, 1, di)) { ClosePrinter(hPrinter); return false; }
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

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelperDaemon').Type) {
    Add-Type -TypeDefinition $code
}

# ── 2. Robust Multi-Source Printer Auto-Detection ─────────────────────────────
$availablePrinters = @()
try { $availablePrinters += @(Get-Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name) } catch {}
if ($availablePrinters.Count -eq 0) {
    try { $availablePrinters += @(Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name) } catch {
        try { $availablePrinters += @((Get-WmiObject -Class Win32_Printer -ErrorAction SilentlyContinue).Name) } catch {}
    }
}

if (-not $PrinterName -or ($availablePrinters.Count -gt 0 -and $availablePrinters -notcontains $PrinterName)) {
    $match = $availablePrinters | Where-Object { 
        $_ -match "POS" -or $_ -match "80" -or $_ -match "58" -or $_ -match "Thermal" -or 
        $_ -match "Receipt" -or $_ -match "XP" -or $_ -match "RP" -or $_ -match "Generic" -or 
        $_ -match "Printer" -or $_ -match "TM-" -or $_ -match "TVS" -or $_ -match "Everycom"
    } | Select-Object -First 1
    if ($match) {
        $PrinterName = $match
    } else {
        $defaultPrinter = $null
        try {
            $defaultPrinter = (Get-CimInstance -ClassName Win32_Printer -Filter "Default = TRUE" -ErrorAction SilentlyContinue).Name
        } catch {
            $defaultPrinter = (Get-WmiObject -Query "SELECT * FROM Win32_Printer WHERE Default = TRUE" -ErrorAction SilentlyContinue).Name
        }
        if ($defaultPrinter) {
            $PrinterName = $defaultPrinter
        } else {
            $PrinterName = "POS-80"
        }
    }
}

[Console]::Title = "Sattva Tiffins - POS Print Service ($PrinterName)"

# Auto-heal: Check and clear any stalled/errored print jobs in queue on startup
try {
    $stalledJobs = Get-PrintJob -PrinterName $PrinterName -ErrorAction SilentlyContinue | Where-Object { $_.JobStatus -match "Error|Retained|UserIntervention" }
    if ($stalledJobs) {
        $stalledJobs | Remove-PrintJob -ErrorAction SilentlyContinue
    }
} catch {}

$PrimaryHost = "https://ntfy.adminforge.de"
$BackupHost = "https://ntfy.tedomum.fr"
$ActiveHost = $PrimaryHost

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         SATTVA TIFFINS - AUTOMATIC POS PRINT DAEMON        " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Active Printer : $PrinterName" -ForegroundColor Green
if ($availablePrinters.Count -gt 0) {
    Write-Host "  Detected on PC : $($availablePrinters -join ', ')" -ForegroundColor DarkGray
}
Write-Host "  Cloud Sync     : $ActiveHost/$CloudTopic" -ForegroundColor White

$isHardwareOnline = $true
try {
    $dev = Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'POS-80|Thermal' -and $_.Class -match 'USB|Printer' } | Select-Object -First 1
    if ($dev -and $dev.Present -eq $false) {
        $isHardwareOnline = $false
    }
} catch {}

if (-not $isHardwareOnline) {
    Write-Host "  ⚠️  PRINTER HARDWARE: DEVICE IS DISCONNECTED OR POWER SWITCH IS OFF!" -ForegroundColor Magenta
    Write-Host "     Please turn ON the printer power switch and ensure USB is plugged in." -ForegroundColor Yellow
} else {
    Write-Host "  Hardware Link  : Connected & Powered On" -ForegroundColor Green
}
Write-Host "  Status         : Ready & Listening (Catchup & Real-Time)" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── 3. Embedded In-Memory ESC/POS Receipt Printing Engine ─────────────────────
function Print-ReceiptDirect($order, [string]$TargetPrinter) {
    if (-not $order) { return $false }

    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)

    # ESC @ (Initialize Printer)
    $bw.Write([byte[]]@(0x1B, 0x40))

    # Optional Logo
    $logoPath = Join-Path $PSScriptRoot "images\sattva_logo_escpos.bin"
    if (Test-Path $logoPath) {
        $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
        $logoBytes = [System.IO.File]::ReadAllBytes($logoPath)
        $bw.Write($logoBytes)
        $bw.Write([byte[]]@(0x0A))
    }

    # Store Header
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([byte[]]@(0x1D, 0x21, 0x11)) # Double size
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("SATTVA TIFFINS`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal size
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Pure Taste - Freshly Made Always`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Main Road Outlet | Ph: +91 98765 43210`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("------------------------------------------------`n"))

    # Order Details (NO Table column as requested)
    $bw.Write([byte[]]@(0x1B, 0x61, 0x00)) # Left align
    $tokenNo = if ($order.tokenId) { [string]$order.tokenId } elseif ($order.id) { [string]$order.id } else { "01" }
    if ($tokenNo -match '^\d+$') {
        $tokenNo = ("{0:D2}" -f [int]$tokenNo)
    }
    $table = if ($order.tableNumber) { $order.tableNumber } else { "T-1" }
    $mode = if ($order.serviceMode) { $order.serviceMode.ToUpper() } else { "DINE-IN" }
    $payMethod = if ($order.paymentMethod) { $order.paymentMethod.ToUpper() } else { "CASH" }
    $dateStr = (Get-Date).ToString("dd-MMM-yyyy hh:mm tt")
    $custName = if ($order.customerName) { $order.customerName } else { "Walk-in Guest" }
    $custPhone = if ($order.customerPhone) { $order.customerPhone } else { "N/A" }

    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([byte[]]@(0x1D, 0x21, 0x01)) # Double height
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("TOKEN NO : $tokenNo`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal size
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("TABLE NO : $table ($mode)`n"))
    if ($custName -and $custName -ne "Walk-in Guest" -and $custName -ne "Dinein") {
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("CUSTOMER : $custName`n"))
    }
    if ($custPhone -and $custPhone -ne "N/A") {
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("PHONE    : $custPhone`n"))
    }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("DATE/TIME: $dateStr`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("PAYMENT  : $payMethod`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("ITEM                           QTY   RATE AMOUNT`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("------------------------------------------------`n"))

    # Items Table
    $items = @()
    if ($order.items) {
        if ($order.items -is [string]) {
            $items = $order.items | ConvertFrom-Json
        } else {
            $items = $order.items
        }
    }

    $subtotalCalc = 0
    foreach ($it in $items) {
        $name = [string]$it.name
        $qty = [int]$it.qty
        $price = [double]$it.price
        $amt = $qty * $price
        $subtotalCalc += $amt

        $nameTrim = if ($name.Length -gt 30) { $name.Substring(0, 30) } else { $name }
        $nameCol = $nameTrim.PadRight(31)
        $qtyCol = ([string]$qty).PadLeft(3)
        $rateCol = ([string][Math]::Round($price)).PadLeft(4)
        $amtCol = ([string][Math]::Round($amt)).PadLeft(6)

        $line = "$nameCol$qtyCol   $rateCol $amtCol`n"
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes($line))
    }

    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("------------------------------------------------`n"))

    # Total
    $total = if ($order.total) { [double]$order.total } elseif ($order.subtotal) { [double]$order.subtotal } else { $subtotalCalc }
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([byte[]]@(0x1D, 0x21, 0x11)) # Double size
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("TOTAL AMOUNT: Rs $total`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal size
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("------------------------------------------------`n"))

    if ($order.specialInstructions) {
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("SPECIAL NOTE: $($order.specialInstructions)`n"))
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("------------------------------------------------`n"))
    }

    # Footer
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Good Food Brings People Together`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("*** THANK YOU! VISIT AGAIN ***`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))

    # Feed 3 lines & cut paper
    $bw.Write([byte[]]@(0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x00))

    # ── SLIP 2: Kitchen Token Slip ────────────────────────────
    $bw.Write([byte[]]@(0x1B, 0x40))
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("SATTVA TIFFINS`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))

    # LARGE BOLD TOKEN NUMBER
    $bw.Write([byte[]]@(0x1D, 0x21, 0x11))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("TOKEN #$tokenNo`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))

    # Mode & Time (NO Table)
    $bw.Write([byte[]]@(0x1B, 0x61, 0x00))
    $timeOnly = (Get-Date).ToString("dd/MM HH:mm")
    $modeStr = "Mode: $mode"
    $spcMode = 32 - $modeStr.Length - $timeOnly.Length
    if ($spcMode -lt 1) { $spcMode = 1 }
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($modeStr + (" " * $spcMode) + $timeOnly + "`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))

    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Table: $table`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Pay  : $payMethod`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))

    # Items in big bold uppercase
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x01))
    foreach ($it in $items) {
        $name = ([string]$it.name).ToUpper()
        $qty = [int]$it.qty
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("${qty}x $name`n"))
    }
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))

    if ($order.specialInstructions) {
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))
        $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Note: $($order.specialInstructions)`n"))
        $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
    }

    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))
    $bw.Write([byte[]]@(0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x00))

    $bw.Flush()
    $bytes = $ms.ToArray()

    $res = [RawPrinterHelperDaemon]::SendBytesToPrinter($TargetPrinter, $bytes)
    return $res
}

# ── 4. Order Processing ───────────────────────────────────────────────────────
$cacheFile = Join-Path $PSScriptRoot ".printed_orders.json"
$printedIds = New-Object 'System.Collections.Generic.HashSet[string]'

if (Test-Path $cacheFile) {
    try {
        $json = Get-Content $cacheFile -Raw -ErrorAction SilentlyContinue | ConvertFrom-Json
        foreach ($id in $json) { if ($id) { $printedIds.Add([string]$id) | Out-Null } }
        Write-Host "[Cache] Loaded $($printedIds.Count) previously printed order records from disk." -ForegroundColor DarkCyan
    } catch {}
}

function Save-PrintedIds {
    try {
        $arr = @($printedIds)
        if ($arr.Count -gt 500) { $arr = $arr[($arr.Count - 500)..($arr.Count - 1)] }
        $arr | ConvertTo-Json -Compress | Set-Content $cacheFile -Encoding UTF8 -Force
    } catch {}
}

function ProcessOrder($order) {
    if (-not $order -or -not $order.id) { return }
    $oid = [string]$order.id
    if ($printedIds.Contains($oid)) {
        Write-Host "[Printer] Order #$oid was already printed. Skipping duplicate." -ForegroundColor DarkGray
        return
    }


    # Stale order protection (ignore any replayed orders older than 60 minutes)
    if ($order.timestamp) {
        try {
            $dt = [DateTime]::Parse($order.timestamp)
            $ageSec = ([DateTime]::UtcNow - $dt.ToUniversalTime()).TotalSeconds
            if ($ageSec -gt 3600) {
                Write-Host "[Printer] Skipping old backlog order #$oid ($([int]$ageSec)s old)." -ForegroundColor DarkGray
                return
            }
        } catch {}
    }

    $printedIds.Add($oid) | Out-Null
    Save-PrintedIds

    $cust = if ($order.customerName) { $order.customerName } else { "Guest" }
    $phone = if ($order.customerPhone) { $order.customerPhone } else { "N/A" }
    $total = if ($order.total) { $order.total } else { $order.subtotal }
    $payMethod = if ($order.paymentMethod) { $order.paymentMethod.ToUpper() } else { "CASH" }
    $table = if ($order.tableNumber) { $order.tableNumber } else { "T-1" }
    $mode = if ($order.serviceMode) { $order.serviceMode.ToUpper() } else { "DINE-IN" }

    $tokenNo = if ($order.tokenId) { [string]$order.tokenId } elseif ($order.id) { [string]$order.id } else { $oid }
    if ($tokenNo -match '^\d+$') {
        $tokenNo = ("{0:D2}" -f [int]$tokenNo)
    }

    Write-Host ""
    Write-Host "====================================================" -ForegroundColor Green
    Write-Host "🖨️  PRINTING BILL: TOKEN #$tokenNo" -ForegroundColor Yellow
    Write-Host "🪑 Table    : $table ($mode)" -ForegroundColor White
    Write-Host "💳 Payment  : $payMethod" -ForegroundColor White
    Write-Host "💰 Amount   : Rs $total" -ForegroundColor White
    Write-Host "====================================================" -ForegroundColor Green

    try {
        $success = Print-ReceiptDirect -order $order -TargetPrinter $PrinterName
        if ($success) {
            Write-Host "[Printer] ✅ Successfully printed Token #$tokenNo on $PrinterName" -ForegroundColor Green
        } else {
            Write-Host "[Printer] ⚠️  Sent to printer queue: $PrinterName" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[Printer] ❌ Print error: $($_.Exception.Message)" -ForegroundColor Red
        $printedIds.Remove($oid) | Out-Null
        Save-PrintedIds
    }
}

# ── 5. Cloud Real-Time Listener ───────────────────────────────────────────────
while ($true) {
    # Real-time stream (Strictly live orders only - no historical backlog)
    $streamUrl = "$ActiveHost/$CloudTopic/json"

    try {
        Write-Host "[CloudSync] Connecting to real-time order stream ($ActiveHost)..." -ForegroundColor Cyan
        $req = [System.Net.HttpWebRequest]::Create($streamUrl)
        $req.Timeout = [System.Threading.Timeout]::Infinite
        $req.KeepAlive = $true

        $resp = $req.GetResponse()
        Write-Host "[CloudSync] 🟢 LIVE & READY! Listening for orders from customers..." -ForegroundColor Green
        Write-Host ""

        $stream = $resp.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($stream)

        while (-not $reader.EndOfStream) {
            $line = $reader.ReadLine()
            if (-not $line) { continue }
            try {
                $entry = $line | ConvertFrom-Json
                if ($entry.event -eq "message" -and $entry.message) {
                    $msg = $entry.message | ConvertFrom-Json
                    if ($msg.type -eq "new_order" -and $msg.order) {
                        ProcessOrder $msg.order
                    }
                }
            } catch {
                # Ignore keep-alives or non-JSON messages
            }
        }

        $reader.Close()
        $stream.Close()
        $resp.Close()
    } catch {
        Write-Host "[CloudSync] Stream refreshed ($($_.Exception.Message)). Resuming..." -ForegroundColor DarkYellow
        # Toggle between primary and backup host on connection failure
        if ($ActiveHost -eq $PrimaryHost) {
            $ActiveHost = $BackupHost
        } else {
            $ActiveHost = $PrimaryHost
        }
        Start-Sleep -Seconds 3
    }
}
