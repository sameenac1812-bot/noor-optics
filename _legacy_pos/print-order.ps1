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
        di.pDocName = "Noor Opticals Bill";
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

# ── STORE HEADER ─────────────────────────────────────────────────────────────
$bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([byte[]]@(0x1D, 0x21, 0x11)) # Double size
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("NOOR OPTICALS`n"))
$bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal size
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Eyewear & Vision Care Solutions`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Frames * Lenses * Sunglasses`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Ph: +91 98765 43210`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))

# ── INVOICE DETAILS ──────────────────────────────────────────────────────────
$bw.Write([byte[]]@(0x1B, 0x61, 0x00)) # Left align
$tokenNo = if ($order.invoiceNo) { [string]$order.invoiceNo } elseif ($order.tokenId) { "INV-" + [string]$order.tokenId } elseif ($order.id) { "INV-" + [string]$order.id } else { "INV-001" }
$mode = if ($order.serviceMode) { $order.serviceMode } else { "Retail Store" }
$payMethod = if ($order.paymentMethod) { $order.paymentMethod.ToUpper() } else { "CASH" }
$dateStr = (Get-Date).ToString("dd-MMM-yyyy hh:mm tt")
$custName = if ($order.customerName) { $order.customerName } else { "Valued Customer" }
$custPhone = if ($order.customerPhone) { $order.customerPhone } else { "N/A" }

$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("BILL NO : $tokenNo`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("DATE    : $dateStr`n"))
if ($custName -and $custName -ne "Walk-in Guest") {
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("CUSTOMER: $custName`n"))
}
if ($custPhone -and $custPhone -ne "N/A") {
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("CONTACT : $custPhone`n"))
}
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("PAYMENT : $payMethod`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x01))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("ITEM             QTY  RATE   AMT`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))

# ── ITEMS TABLE (32 Columns for 58mm & 80mm compatibility) ───────────────────
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

    $nameTrim = if ($name.Length -gt 15) { $name.Substring(0, 15) } else { $name }
    $nameCol = $nameTrim.PadRight(16)
    $qtyCol = ([string]$qty).PadLeft(3)
    $rateCol = ([string][Math]::Round($price)).PadLeft(6)
    $amtCol = ([string][Math]::Round($amt)).PadLeft(7)

    $line = "$nameCol$qtyCol$rateCol$amtCol`n"
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($line))
}

$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))

# ── TOTALS ───────────────────────────────────────────────────────────────────
$total = if ($order.total) { [double]$order.total } elseif ($order.subtotal) { [double]$order.subtotal } else { $subtotalCalc }

$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([byte[]]@(0x1D, 0x21, 0x11)) # Double size
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("TOTAL: Rs $total`n"))
$bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal size
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))

if ($order.specialInstructions) {
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Rx / Notes: $($order.specialInstructions)`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))
}

# ── FOOTER ───────────────────────────────────────────────────────────────────
$bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Clear Vision - Better Life`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x01))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("*** THANK YOU! VISIT AGAIN ***`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("NOOR OPTICALS`n"))

# Feed 4 lines and cut paper
$bw.Write([byte[]]@(0x0A, 0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x00))

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
