param(
    [string]$PrinterName = "POS-80"
)

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelperInstant {
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
        di.pDocName = "Noor Customer Bill";
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

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelperInstant').Type) {
    Add-Type -TypeDefinition $code
}

# Resolve Printer Name once
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
        if ($defaultPrinter) { $PrinterName = $defaultPrinter }
    }
}

function Print-InstantReceipt($order) {
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)

    # ESC @ (Initialize)
    $bw.Write([byte[]]@(0x1B, 0x40))

    # Optional Logo
    $logoPath = Join-Path $PSScriptRoot "images\Noor_logo_escpos.bin"
    if (Test-Path $logoPath) {
        $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
        $logoBytes = [System.IO.File]::ReadAllBytes($logoPath)
        $bw.Write($logoBytes)
        $bw.Write([byte[]]@(0x0A))
    }

    # Store Header
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([byte[]]@(0x1D, 0x21, 0x11)) # Double size
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Noor Optics`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal size
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Pure Taste - Freshly Made Always`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Main Road Outlet | Ph: +91 98765 43210`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("------------------------------------------------`n"))

    # Order Details
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

    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("TOKEN NO : $tokenNo`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
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
        if ($order.items -is [string]) { $items = $order.items | ConvertFrom-Json } else { $items = $order.items }
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

    $total = if ($order.total) { [double]$order.total } elseif ($order.subtotal) { [double]$order.subtotal } else { $subtotalCalc }
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x11))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("TOTAL AMOUNT: Rs $total`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("------------------------------------------------`n"))

    if ($order.specialInstructions) {
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("SPECIAL NOTE: $($order.specialInstructions)`n"))
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("------------------------------------------------`n"))
    }

    # Footer
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Good Food Brings People Together`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("*** THANK YOU! VISIT AGAIN ***`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
    $bw.Write([byte[]]@(0x0A, 0x0A, 0x0A, 0x1D, 0x56, 0x41, 0x00)) # Cut 1

    # Slip 2: Kitchen Token Slip
    $bw.Write([byte[]]@(0x1B, 0x40))
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Noor Optics`n================================`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x11))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("TOKEN #$tokenNo`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))
    $bw.Write([byte[]]@(0x1B, 0x61, 0x00))
    $timeOnly = (Get-Date).ToString("dd/MM HH:mm")
    $modeStr = "Mode: $mode"
    $spcMode = 32 - $modeStr.Length - $timeOnly.Length
    if ($spcMode -lt 1) { $spcMode = 1 }
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($modeStr + (" " * $spcMode) + $timeOnly + "`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Table: $table`nPay  : $payMethod`n--------------------------------`n"))
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
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`nNote: $($order.specialInstructions)`n"))
    }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n`n`n"))
    $bw.Write([byte[]]@(0x1D, 0x56, 0x41, 0x00)) # Cut 2

    $bw.Flush()
    $bytes = $ms.ToArray()
    return [RawPrinterHelperInstant]::SendBytesToPrinter($PrinterName, $bytes)
}

# Signal worker is fully preheated and ready
[Console]::Out.WriteLine("WORKER_READY:$PrinterName")

while ($true) {
    $line = [Console]::In.ReadLine()
    if ($null -eq $line) { break }
    if ([string]::IsNullOrWhiteSpace($line)) { continue }
    try {
        $order = $line | ConvertFrom-Json
        $res = Print-InstantReceipt $order
        $oid = if ($order.id) { [string]$order.id } else { "UNKNOWN" }
        if ($res) {
            [Console]::Out.WriteLine("PRINT_SUCCESS:$oid")
        } else {
            [Console]::Out.WriteLine("PRINT_FAIL:$oid")
        }
    } catch {
        [Console]::Out.WriteLine("PRINT_ERROR:" + $_.Exception.Message)
    }
}
