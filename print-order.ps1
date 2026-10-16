param(
    [string]$OrderJson = "",
    [string]$OrderFile = "",
    [string]$PrinterName = "POS-80"
)

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelperOrder {
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

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelperOrder').Type) {
    Add-Type -TypeDefinition $code
}

$rawJson = ""
if ($OrderJson) {
    $rawJson = $OrderJson
} elseif ($OrderFile -and (Test-Path $OrderFile)) {
    $rawJson = Get-Content $OrderFile -Raw
} else {
    $rawJson = [Console]::In.ReadToEnd()
}

if (-not $rawJson) {
    Write-Error "No order data provided."
    exit 1
}

$order = $rawJson | ConvertFrom-Json

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# ESC @ (Initialize Printer)
$bw.Write([byte[]]@(0x1B, 0x40))

# ── LOGO (Centered) ──────────────────────────────────────────────────────────
$logoPath = Join-Path $PSScriptRoot "images\sattva_logo_escpos.bin"
if (Test-Path $logoPath) {
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $logoBytes = [System.IO.File]::ReadAllBytes($logoPath)
    $bw.Write($logoBytes)
    $bw.Write([byte[]]@(0x0A))
}

# ── STORE HEADER ─────────────────────────────────────────────────────────────
$bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([byte[]]@(0x1D, 0x21, 0x11)) # Double size
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("SATTVA TIFFINS`n"))
$bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal size
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Pure Taste - Freshly Made Always`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Main Road Outlet | Ph: +91 98765 43210`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("------------------------------------------------`n"))

# ── ORDER DETAILS ────────────────────────────────────────────────────────────
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

# ── ITEMS TABLE ──────────────────────────────────────────────────────────────
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

    # Format 48 cols: Name (31), Qty (3), Gap (3), Rate (4), Gap (1), Amount (6)
    $nameTrim = if ($name.Length -gt 30) { $name.Substring(0, 30) } else { $name }
    $nameCol = $nameTrim.PadRight(31)
    $qtyCol = ([string]$qty).PadLeft(3)
    $rateCol = ([string][Math]::Round($price)).PadLeft(4)
    $amtCol = ([string][Math]::Round($amt)).PadLeft(6)

    $line = "$nameCol$qtyCol   $rateCol $amtCol`n"
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($line))
}

$bw.Write([System.Text.Encoding]::ASCII.GetBytes("------------------------------------------------`n"))

# ── TOTALS ───────────────────────────────────────────────────────────────────
$total = if ($order.total) { [double]$order.total } elseif ($order.subtotal) { [double]$order.subtotal } else { $subtotalCalc }

# Grand Total Bold + Double Size
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

# ── FOOTER ───────────────────────────────────────────────────────────────────
$bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Good Food Brings People Together`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x01))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("*** THANK YOU! VISIT AGAIN ***`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00))

# Feed 3 lines and cut paper for Main Bill
$bw.Write([byte[]]@(0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x00))

# ═════════════════════════════════════════════════════════════════════════════
# ── SLIP 2: ULTRA-COMPACT KITCHEN TOKEN SLIP (Even Smaller, No Costs) ─────────
# ═════════════════════════════════════════════════════════════════════════════

$bw.Write([byte[]]@(0x1B, 0x40))

# Store Title (Single compact line)
$bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("SATTVA TIFFINS`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))

# LARGE BOLD TOKEN NUMBER
$bw.Write([byte[]]@(0x1D, 0x21, 0x11)) # Double size
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("TOKEN #$tokenNo`n"))
$bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal size
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))

# Compact Meta: Mode & Time on one line
$bw.Write([byte[]]@(0x1B, 0x61, 0x00)) # Left
$timeOnly = (Get-Date).ToString("dd/MM HH:mm")
$modeStr = "Mode: $mode"
$spcMode = 32 - $modeStr.Length - $timeOnly.Length
if ($spcMode -lt 1) { $spcMode = 1 }
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold
$bw.Write([System.Text.Encoding]::ASCII.GetBytes($modeStr + (" " * $spcMode) + $timeOnly + "`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00))

$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Table: $table`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Pay  : $payMethod`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))

# Items List (Compact, Bold, One Point Bigger, ALL UPPERCASE)
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([byte[]]@(0x1D, 0x21, 0x01)) # One point bigger (double-height)
foreach ($it in $items) {
    $name = ([string]$it.name).ToUpper()
    $qty = [int]$it.qty
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("${qty}x $name`n"))
}
$bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal size
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off

if ($order.specialInstructions) {
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Note: $($order.specialInstructions)`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
}

$bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))

# Feed minimal 2 lines and cut
$bw.Write([byte[]]@(0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x00))

$bw.Flush()
$bytes = $ms.ToArray()

# Robust multi-source printer detection
$installedPrinters = @()
try { $installedPrinters += @(Get-Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name) } catch {}
if ($installedPrinters.Count -eq 0) {
    try { $installedPrinters += @(Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name) } catch {
        try { $installedPrinters += @((Get-WmiObject -Class Win32_Printer -ErrorAction SilentlyContinue).Name) } catch {}
    }
}

if ($installedPrinters.Count -gt 0 -and $installedPrinters -notcontains $PrinterName) {
    $match = $installedPrinters | Where-Object { 
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
        }
    }
}

$res = [RawPrinterHelperOrder]::SendBytesToPrinter($PrinterName, $bytes)
if ($res) {
    Write-Output "SUCCESS: Printed bill for Token #$tokenNo on $PrinterName"
} else {
    $printerListMsg = if ($installedPrinters.Count -gt 0) { ($installedPrinters -join ', ') } else { "None found" }
    Write-Error "ERROR: Failed to send bill to '$PrinterName'. (Printers detected on this PC: $printerListMsg)"
}
