param(
    [string]$PrinterName = "POS-80"
)

$code = @"
using System;
using System.IO;
using System.Runtime.InteropServices;

public class RawPrinterHelperTest {
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
        di.pDocName = "Thermal Test Print";
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

if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelperTest').Type) {
    Add-Type -TypeDefinition $code
}

$ms = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter($ms)

# ESC @ (Initialize Printer)
$bw.Write([byte[]]@(0x1B, 0x40))

# ── Store Header (Centered) ──────────────────────────────────────────
$bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center align
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([byte[]]@(0x1D, 0x21, 0x11)) # Double height & width
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("NOOR OPTICS`n"))
$bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal font size
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("TEST PRINT - THERMAL RECEIPT`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))

# ── Device & Session Info (Left-aligned) ─────────────────────────────
$bw.Write([byte[]]@(0x1B, 0x61, 0x00)) # Left align
$dateStr = (Get-Date).ToString("dd-MMM-yyyy hh:mm:ss tt")
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("TIME    : $dateStr`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("PRINTER : $PrinterName (USB)`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("STATUS  : Hardware Online OK`n"))
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("--------------------------------`n"))

# ── Random Test Data ────────────────────────────────────────────────
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("RANDOM TEST DATA:`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off

$randomTexts = @(
    "Spherical: -2.25 Cyl: -0.50 Axis: 180",
    "Model: Noor Titanium Pure-07 Gold",
    "Anti-reflective BlueCut: PASS",
    "The quick brown fox jumps over the lazy dog.",
    "Baud: 9600 | ESC/POS Command: Valid",
    "Paper Sensor: OK | Cutter: Auto-Cut"
)

foreach ($line in $randomTexts) {
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("$line`n"))
}

$bw.Write([System.Text.Encoding]::ASCII.GetBytes("================================`n"))

# ── Center Footer & Cut ──────────────────────────────────────────────
$bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
$bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("*** TEST COMPLETED ***`n"))
$bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
$bw.Write([System.Text.Encoding]::ASCII.GetBytes("Auto-cutting paper now...`n"))

# Feed 4 lines so text clears the auto-cutter blade
$bw.Write([byte[]]@(0x0A, 0x0A, 0x0A, 0x0A, 0x0A))

# ESC/POS Cut Commands:
# GS V 65 0 (0x1D, 0x56, 0x41, 0x00) -> Feed paper and full cut
$bw.Write([byte[]]@(0x1D, 0x56, 0x41, 0x00))
# GS V 0 (0x1D, 0x56, 0x00) -> Full cut fallback
$bw.Write([byte[]]@(0x1D, 0x56, 0x00))
# ESC m (0x1B, 0x6D) -> Partial cut
$bw.Write([byte[]]@(0x1B, 0x6D))
# ESC i (0x1B, 0x69) -> Full cut
$bw.Write([byte[]]@(0x1B, 0x69))

$bw.Flush()
$bytes = $ms.ToArray()

$res = [RawPrinterHelperTest]::SendBytesToPrinter($PrinterName, $bytes)
if ($res) {
    Write-Output "SUCCESS: Test print and paper cut command sent to '$PrinterName'."
} else {
    Write-Error "ERROR: Could not send raw data to printer '$PrinterName'."
    exit 1
}
