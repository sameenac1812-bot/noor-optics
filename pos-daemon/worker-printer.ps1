<#
.SYNOPSIS
    pos-daemon/worker-printer.ps1 - High-speed Win32 Raw ESC/POS Spooler Worker
    Directly submits raw ESC/POS binary or text to any Windows Thermal Receipt Printer.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [Parameter(Mandatory = $false)]
    [string]$PrinterName = "POS-80",

    [Parameter(Mandatory = $false)]
    [string]$DocName = "Noor Thermal Receipt"
)

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

if (-not (Test-Path $FilePath)) {
    Write-Error "Print payload file not found: $FilePath"
    exit 1
}

# Compile Win32 Spooler helper once
$code = @"
using System;
using System.IO;
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
        IntPtr hPrinter = IntPtr.Zero;
        DOCINFOA di = new DOCINFOA();
        di.pDocName = string.IsNullOrEmpty(szDocName) ? "POS Thermal Receipt" : szDocName;
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

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelperDirect').Type) {
    Add-Type -TypeDefinition $code
}

# Resolve Printer Name (Auto-fallback to any connected thermal / POS printer)
$installed = @()
try { $installed += @(Get-Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name) } catch {}
if ($installed.Count -eq 0) {
    try { $installed += @(Get-CimInstance -ClassName Win32_Printer -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Name) } catch {}
}

$resolvedPrinter = $PrinterName
if ($installed.Count -gt 0 -and $installed -notcontains $PrinterName) {
    $match = $installed | Where-Object { 
        $_ -match "POS" -or $_ -match "80" -or $_ -match "58" -or $_ -match "Thermal" -or 
        $_ -match "Receipt" -or $_ -match "XP" -or $_ -match "RP" -or $_ -match "Generic" -or 
        $_ -match "Printer" -or $_ -match "TM-" -or $_ -match "TVS" -or $_ -match "Everycom"
    } | Select-Object -First 1

    if ($match) {
        $resolvedPrinter = $match
    } else {
        $defaultPrinter = (Get-CimInstance -ClassName Win32_Printer -Filter "Default = TRUE" -ErrorAction SilentlyContinue).Name
        if ($defaultPrinter) { $resolvedPrinter = $defaultPrinter }
    }
}

try {
    $bytes = [System.IO.File]::ReadAllBytes($FilePath)
    $ok = [RawPrinterHelperDirect]::SendBytesToPrinter($resolvedPrinter, $bytes, $DocName)

    if ($ok) {
        Write-Output "SUCCESS: Printed $($bytes.Length) bytes to '$resolvedPrinter'"
        exit 0
    } else {
        $lastErr = [System.Runtime.InteropServices.Marshal]::GetLastWin32Error()
        Write-Error "FAILED: Spooler returned Win32 error code $lastErr for '$resolvedPrinter'"
        exit 1
    }
} catch {
    Write-Error "EXCEPTION: $_"
    exit 1
}

