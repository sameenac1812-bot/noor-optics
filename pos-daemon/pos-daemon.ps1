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

# ── Paper Width & UPI Configuration (Tweakable) ──
$PAPER_WIDTH_COLS = 32 # Characters per line for 2.5-inch thermal paper
$UPI_ID = "9182341567@mairtel" # Shop UPI ID for payment QR code & receipt text

try {
    [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch {}

$ScriptDir = if ($PSScriptRoot) { $PSScriptRoot } elseif ($MyInvocation.MyCommand.Definition) { Split-Path -Parent $MyInvocation.MyCommand.Definition } else { (Get-Location).Path }
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

$dllPath = Join-Path $ScriptDir "RawPrinterHelper.dll"
if (Test-Path $dllPath) {
    try { Add-Type -Path $dllPath -ErrorAction SilentlyContinue } catch {}
}
if (-not ([System.Management.Automation.PSTypeName]'RawPrinterHelperDirect').Type) {
    try { Add-Type -TypeDefinition $win32Code -ErrorAction SilentlyContinue } catch {}
}

# Load Configuration
$Config = @{
    port = $Port
    printerName = $PrinterName
    paperWidthInch = 2.5
    columns = 32
    storeName = "NOOR OPTIC"
    storeTagline = ""
    storeAddress = "Pillar No. 45, Rethibowli, Hyderabad, Telangana 500028"
    storePhone = "+91 98765 43210"
    storeGstin = "29AAAAA0000A1Z5"
    orderFreshnessMinutes = 120
    supabaseUrl = "https://czajxtgwsxbrrymrhauz.supabase.co"
    supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YWp4dGd3c3hicnJ5bXJoYXV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMwODk2NzUsImV4cCI6MjEwODY2NTY3NX0.zfA4TBBOtxEH4kET9a8WjOOf6sS7dULOo9rh42Bpxdk"
}

if (Test-Path $ConfigFile) {
    try {
        $json = Get-Content $ConfigFile -Raw | ConvertFrom-Json
        if ($json.port) { $Config.port = [int]$json.port }
        if ($json.printerName) { $Config.printerName = [string]$json.printerName }
        if ($json.storeName) { $Config.storeName = [string]$json.storeName }
        if ($json.storeAddress) { $Config.storeAddress = [string]$json.storeAddress }
        if ($json.storePhone) { $Config.storePhone = [string]$json.storePhone }
        if ($json.supabaseUrl) { $Config.supabaseUrl = [string]$json.supabaseUrl }
        if ($json.supabaseAnonKey) { $Config.supabaseAnonKey = [string]$json.supabaseAnonKey }
        if ($json.orderFreshnessMinutes) { $Config.orderFreshnessMinutes = [int]$json.orderFreshnessMinutes }
    } catch {}
}

# Auto-Detect POS Printer
try {
    $allPrinters = @()
    try { $allPrinters += @(Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue) } catch {}
    if ($allPrinters.Count -eq 0) { try { $allPrinters += @(Get-Printer -ErrorAction SilentlyContinue) } catch {} }

    $installedNames = @($allPrinters | Select-Object -ExpandProperty Name)

    Write-Host ""
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host "[Printer Discovery] Scanning Windows Printers..." -ForegroundColor Cyan
    $idx = 1
    foreach ($p in $installedNames) {
        $isVirt = $p -match 'PDF|OneNote|Fax|XPS|Root Print Queue|Document Writer'
        $tag = if ($isVirt) { " (Virtual)" } else { "" }
        Write-Host "  $idx. $p$tag"
        $idx++
    }

    $physical = $installedNames | Where-Object { $_ -notmatch 'PDF|OneNote|Fax|XPS|Root Print Queue|Document Writer' }

    if ($installedNames -contains $Config.printerName) {
        Write-Host "[Printer Discovery] Active Target: '$($Config.printerName)' (Configured)" -ForegroundColor Green
    } else {
        $autoMatch = $physical | Where-Object { 
            $_ -match "POS" -or $_ -match "80" -or $_ -match "58" -or $_ -match "Thermal" -or 
            $_ -match "Receipt" -or $_ -match "XP" -or $_ -match "RP" -or $_ -match "Text Only" -or 
            $_ -match "Generic" -or $_ -match "Everycom" -or $_ -match "TVS" -or $_ -match "Epson" -or 
            $_ -match "Citizen" -or $_ -match "Star" -or $_ -match "HPRT" -or $_ -match "ZJ" -or 
            $_ -match "Xprinter" -or $_ -match "Rongta" -or $_ -match "Gprinter" -or $_ -match "Black Copper" -or 
            $_ -match "Bixolon" -or $_ -match "Barcode"
        } | Select-Object -First 1

        if ($autoMatch) {
            Write-Host "[Auto-Detect] Switched printer to connected POS device: '$autoMatch'" -ForegroundColor Green
            $Config.printerName = $autoMatch
        } else {
            $defaultPrinter = (Get-CimInstance Win32_Printer -Filter "Default = TRUE" -ErrorAction SilentlyContinue).Name
            if ($defaultPrinter -and $defaultPrinter -notmatch 'PDF|OneNote|Fax|XPS|Root Print Queue|Document Writer') {
                Write-Host "[Auto-Detect] Using Windows Default Printer: '$defaultPrinter'" -ForegroundColor Green
                $Config.printerName = $defaultPrinter
            } elseif ($physical.Count -gt 0) {
                Write-Host "[Auto-Detect] Using physical printer: '$($physical[0])'" -ForegroundColor Green
                $Config.printerName = $physical[0]
            }
        }
    }
    Write-Host "=======================================================" -ForegroundColor Cyan
    Write-Host ""
} catch {}

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

Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue

function Convert-BitmapToEscPosRaster([System.Drawing.Bitmap]$bitmap) {
    if (-not $bitmap) { return @() }
    try {
        $w = $bitmap.Width
        $h = $bitmap.Height
        $widthBytes = [int][Math]::Ceiling($w / 8.0)

        $ms = New-Object System.IO.MemoryStream
        $bw = New-Object System.IO.BinaryWriter($ms)

        # GS v 0 (0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH)
        $bw.Write([byte]0x1D)
        $bw.Write([byte]0x76)
        $bw.Write([byte]0x30)
        $bw.Write([byte]0x00)
        $bw.Write([byte]($widthBytes % 256))
        $bw.Write([byte]([Math]::Floor($widthBytes / 256)))
        $bw.Write([byte]($h % 256))
        $bw.Write([byte]([Math]::Floor($h / 256)))

        for ($y = 0; $y -lt $h; $y++) {
            for ($xb = 0; $xb -lt $widthBytes; $xb++) {
                $byteVal = 0
                for ($bit = 0; $bit -lt 8; $bit++) {
                    $x = ($xb * 8) + $bit
                    if ($x -lt $w) {
                        $pixel = $bitmap.GetPixel($x, $y)
                        $lum = (0.299 * $pixel.R) + (0.587 * $pixel.G) + (0.114 * $pixel.B)
                        if ($pixel.A -gt 128 -and $lum -lt 128) {
                            $byteVal = $byteVal -bor (0x80 -shr $bit)
                        }
                    }
                }
                $bw.Write([byte]$byteVal)
            }
        }

        $res = $ms.ToArray()
        $bw.Close()
        $ms.Close()
        return $res
    } catch {
        return @()
    }
}

function Convert-DataUrlToEscPosRaster([string]$dataUrl) {
    if (-not $dataUrl) { return @() }
    try {
        $base64 = $dataUrl
        if ($base64 -match "base64,(.+)") { $base64 = $matches[1] }
        $bytes = [Convert]::FromBase64String($base64)
        $ms = New-Object System.IO.MemoryStream($bytes, 0, $bytes.Length)
        $bmp = [System.Drawing.Bitmap]::FromStream($ms)
        $res = Convert-BitmapToEscPosRaster $bmp
        $bmp.Dispose()
        $ms.Close()
        return $res
    } catch {
        return @()
    }
}

# Pre-load QRCoder engine if present and unblock
$qrCoderDll = Join-Path $ScriptDir "assets\QRCoder.dll"
if (Test-Path $qrCoderDll) {
    try {
        Unblock-File -Path $qrCoderDll -ErrorAction SilentlyContinue
        Add-Type -Path $qrCoderDll -ErrorAction SilentlyContinue
    } catch {}
}

function Generate-UnifiedStickerRaster([string]$sku, [string]$name, [string]$price) {
    try {
        # 1. Generate 2D QR Code Bitmap with Solid Finders and 3x3 Dotted Modules
        $qrBmp = $null
        $dll = Join-Path $ScriptDir "assets\QRCoder.dll"
        if (Test-Path $dll) {
            try {
                Unblock-File -Path $dll -ErrorAction SilentlyContinue
                Add-Type -Path $dll -ErrorAction SilentlyContinue
                Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
                $gen = New-Object QRCoder.QRCodeGenerator
                $data = $gen.CreateQrCode($sku, [QRCoder.QRCodeGenerator+ECCLevel]::M)
                $matrix = $data.ModuleMatrix
                $rawCount = $matrix.Count # 29
                $quietTrim = 4
                $coreSize = $rawCount - ($quietTrim * 2) # 21 data modules

                # Clean 2-module quiet zone around data core
                $targetQuiet = 2
                $totalMods = $coreSize + ($targetQuiet * 2) # 25
                $qrScale = 4 # 25 * 4 = 100 pixels (~12.5mm)
                $qrBmpW = $totalMods * $qrScale

                $customQrBmp = New-Object System.Drawing.Bitmap($qrBmpW, $qrBmpW)
                $gQr = [System.Drawing.Graphics]::FromImage($customQrBmp)
                $gQr.Clear([System.Drawing.Color]::White)
                $brushB = [System.Drawing.Brushes]::Black

                for ($my = 0; $my -lt $totalMods; $my++) {
                    $ay = $my - $targetQuiet # 0..20 core
                    for ($mx = 0; $mx -lt $totalMods; $mx++) {
                        $ax = $mx - $targetQuiet # 0..20 core
                        
                        $isBlack = $false
                        if ($ax -ge 0 -and $ax -lt $coreSize -and $ay -ge 0 -and $ay -lt $coreSize) {
                            $isBlack = $matrix[$ay + $quietTrim][$ax + $quietTrim]
                        }
                        
                        if ($isBlack) {
                            # Corner position finder squares (7x7 in top-left, top-right, bottom-left)
                            $isFinder = ($ax -lt 7 -and $ay -lt 7) -or `
                                        ($ax -ge ($coreSize - 7) -and $ay -lt 7) -or `
                                        ($ax -lt 7 -and $ay -ge ($coreSize - 7))
                            
                            $px = $mx * $qrScale
                            $py = $my * $qrScale
                            
                            if ($isFinder) {
                                # Solid 4x4 for the 7x7 corner squares (bold, dark, solid black squares)
                                $gQr.FillRectangle($brushB, $px, $py, $qrScale, $qrScale)
                            } else {
                                # 3x3 medium dots inside: bold, dark, vibrant, with 1px thermal isolation to prevent bleeding
                                $gQr.FillRectangle($brushB, $px, $py, 3, 3)
                            }
                        }
                    }
                }
                $gQr.Dispose()
                $qrBmp = $customQrBmp
                $data.Dispose(); $gen.Dispose()
            } catch {}
        }

        # Fallback to online API if QRCoder is unavailable
        if (-not $qrBmp) {
            try {
                $qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=100x100&margin=2&data=" + [System.Uri]::EscapeDataString($sku)
                $wc = New-Object System.Net.WebClient
                $imgData = $wc.DownloadData($qrApiUrl)
                $msImg = New-Object System.IO.MemoryStream($imgData, 0, $imgData.Length)
                $qrBmp = [System.Drawing.Bitmap]::FromStream($msImg)
                $msImg.Close(); $wc.Dispose()
            } catch {}
        }

        if (-not $qrBmp) { return @() }

        # 2. Draw unified 384-dot wide label (~1mm more compact)
        $width = 384
        $height = 200
        $bmp = New-Object System.Drawing.Bitmap($width, $height)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear([System.Drawing.Color]::White)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit

        # Center QR code
        $qrX = [Math]::Floor(($width - $qrBmp.Width) / 2)
        $qrY = 4
        $g.DrawImage($qrBmp, $qrX, $qrY, $qrBmp.Width, $qrBmp.Height)

        # Typography: A little tiny bit bigger
        $fontSku = New-Object System.Drawing.Font("Arial", 8.5, [System.Drawing.FontStyle]::Bold)
        $fontName = New-Object System.Drawing.Font("Arial", 7.5, [System.Drawing.FontStyle]::Regular)
        $fontPrice = New-Object System.Drawing.Font("Arial", 8.5, [System.Drawing.FontStyle]::Bold)
        $brush = [System.Drawing.Brushes]::Black

        $curY = $qrY + $qrBmp.Height + 4

        # SKU
        $sizeSku = $g.MeasureString($sku, $fontSku)
        $xSku = [Math]::Max(0, [Math]::Floor(($width - $sizeSku.Width) / 2))
        $g.DrawString($sku, $fontSku, $brush, $xSku, $curY)
        $curY += [Math]::Floor($sizeSku.Height)

        # Frame Name
        if ($name) {
            $sizeName = $g.MeasureString($name, $fontName)
            $xName = [Math]::Max(0, [Math]::Floor(($width - $sizeName.Width) / 2))
            $g.DrawString($name, $fontName, $brush, $xName, $curY)
            $curY += [Math]::Floor($sizeName.Height)
        }

        # Retail Price
        if ($price) {
            $sizePrice = $g.MeasureString($price, $fontPrice)
            $xPrice = [Math]::Max(0, [Math]::Floor(($width - $sizePrice.Width) / 2))
            $g.DrawString($price, $fontPrice, $brush, $xPrice, $curY)
            $curY += [Math]::Floor($sizePrice.Height) + 3
        }

        $g.Dispose()
        $qrBmp.Dispose()

        # Crop to actual content height (~1mm more compact)
        $finalHeight = [Math]::Min($height, [Math]::Max(90, $curY))
        $cropRect = New-Object System.Drawing.Rectangle(0, 0, $width, $finalHeight)
        $croppedBmp = $bmp.Clone($cropRect, $bmp.PixelFormat)
        $bmp.Dispose()

        $raster = Convert-BitmapToEscPosRaster $croppedBmp
        $croppedBmp.Dispose()
        return $raster
    } catch {
        return @()
    }
}

# Format Optical Temple QR Sticker ESC/POS Bytes (Universal GS v 0 2D Bit Image)
function Format-StickerBytes($rawItems) {
    $allBuffers = New-Object System.IO.MemoryStream
    $allBw = New-Object System.IO.BinaryWriter($allBuffers)

    foreach ($item in $rawItems) {
        $sku = "NOOR-FRAME"
        if ($item.sku) { $sku = [string]$item.sku }
        elseif ($item.product_sku) { $sku = [string]$item.product_sku }
        elseif ($item.id) { $sku = [string]$item.id }
        $sku = $sku.ToUpper()

        $name = ""
        if ($item.name) { $name = [string]$item.name }
        if ($name.Length -gt 24) { $name = $name.Substring(0, 24) }

        $price = ""
        if ($item.price) { $price = [string]$item.price }
        $price = $price.Trim()
        if ($price.StartsWith("₹")) { $price = "Rs. " + $price.Substring(1).Trim() }
        if ($price -and -not $price.ToUpper().StartsWith("RS") -and -not $price.ToUpper().StartsWith("M.R.P")) {
            $price = "Rs. " + $price
        }

        $copies = 1
        if ($item.copies) {
            $copies = [int]$item.copies
        } elseif ($item.quantity) {
            $copies = [int]$item.quantity
        }

        for ($c = 0; $c -lt $copies; $c++) {
            $allBw.Write([byte[]]@(0x1B, 0x40)) # Reset

            # Generate unified 384-dot sticker bitmap in PowerShell (.NET System.Drawing)
            $rasterBytes = Generate-UnifiedStickerRaster $sku $name $price

            # Write unified 2D QR Bit Image (GS v 0) - NEVER prints big plain text!
            if ($rasterBytes -and $rasterBytes.Length -gt 0) {
                $allBw.Write([byte[]]$rasterBytes)
            }

            # Minimal line feed and partial cut
            $allBw.Write([byte[]]@(0x1B, 0x64, 0x01)) # Feed 1 line
            $allBw.Write([byte[]]@(0x1D, 0x56, 0x42, 0x00)) # Partial cut
        }
    }

    $combined = $allBuffers.ToArray()
    $allBw.Close()
    $allBuffers.Close()
    return $combined
}

# Format 2.5-Inch Thermal Receipt (Matches Reference Layout)
function Format-ReceiptBytes($order) {
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)

    $COLS = if ($Config.columns) { [int]$Config.columns } else { $PAPER_WIDTH_COLS }
    $divider = ("-" * $COLS) + "`n"

    function Center-Text($txt) {
        $s = ([string]$txt).Trim()
        if ($s.Length -ge $COLS) { return $s.Substring(0, $COLS) + "`n" }
        $pad = [Math]::Max(0, [int][Math]::Floor(($COLS - $s.Length) / 2))
        return (" " * $pad) + $s + "`n"
    }

    function Row-Text($left, $right) {
        $l = [string]$left
        $r = [string]$right
        if (($l.Length + $r.Length) -ge $COLS) {
            return $l + "`n" + $r.PadLeft($COLS) + "`n"
        }
        $space = [Math]::Max(1, $COLS - $l.Length - $r.Length)
        return $l + (" " * $space) + $r + "`n"
    }

    function Wrap-Lines($text, $width) {
        $words = ([string]$text).Trim() -split '\s+'
        $res = @()
        $cur = ""
        foreach ($w in $words) {
            $next = if ($cur) { "$cur $w" } else { $w }
            if ($next.Length -le $width) {
                $cur = $next
            } else {
                if ($cur) { $res += $cur }
                $cur = $w
            }
        }
        if ($cur) { $res += $cur }
        return $res
    }

    function Format-Num($val) {
        $n = [Math]::Round([double]$val)
        return "{0:N0}" -f $n
    }

    # 1. ESC @ (Initialize)
    $bw.Write([byte[]]@(0x1B, 0x40))

    # 1. Shop logo (reuse logo raster, centered)
    $LogoRasterFile = Join-Path $ScriptDir "assets\logo_raster.bin"
    if (Test-Path $LogoRasterFile) {
        $logoBytes = [System.IO.File]::ReadAllBytes($LogoRasterFile)
        $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
        $bw.Write($logoBytes)
    }

    # 2. Shop name: NOOR OPTIC (centered, large/bold), address & phone
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([byte[]]@(0x1D, 0x21, 0x11)) # Double width & height
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("NOOR OPTIC`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off

    $storeAddress = if ($Config.storeAddress) { $Config.storeAddress } else { "Pillar No. 45, Rethibowli" }
    $addrLines = Wrap-Lines $storeAddress $COLS
    foreach ($al in $addrLines) {
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Center-Text $al)))
    }
    $storePhone = if ($Config.storePhone) { $Config.storePhone } else { "+91 98765 43210" }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Center-Text "Ph: $storePhone")))

    # 3. Dashed line
    $bw.Write([byte[]]@(0x1B, 0x61, 0x00)) # Left
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 4. Invoice no (left) and date + time (right)
    $rawRef = [string]$(if ($order.token_number) { $order.token_number } elseif ($order.order_number) { $order.order_number } elseif ($order.order_ref) { $order.order_ref } elseif ($order.id) { $order.id } else { "4866" })
    $shortRef = if ($rawRef.Contains("-")) { ($rawRef -split "-")[-1] } elseif ($rawRef.Length -gt 6) { $rawRef.Substring($rawRef.Length - 4) } else { $rawRef }
    $invNo = "INV: $shortRef"
    $dateObj = Get-Date
    if ($order.created_at) {
        try { $dateObj = [DateTime]::Parse($order.created_at) } catch {}
    }
    $dateStr = $dateObj.ToString("dd MMM yyyy hh:mm tt")
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text $invNo $dateStr)))

    # 5. Dashed line
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 6. Name, Phone, City, Age, and Pick Up Date & Time under City
    $custName = [string]$(if ($order.customer_name) { $order.customer_name } elseif ($order.customerName) { $order.customerName } elseif ($order.name) { $order.name } elseif ($order.patient_name) { $order.patient_name } elseif ($order.client_name) { $order.client_name } elseif ($order.customer -and $order.customer.name) { $order.customer.name } else { "Walk-in Client" })
    if ($custName.Length -gt 24) { $custName = $custName.Substring(0, 24) }
    $custPhone = [string]$(if ($order.customer_phone) { $order.customer_phone } elseif ($order.customerPhone) { $order.customerPhone } elseif ($order.phone) { $order.phone } elseif ($order.phone_number) { $order.phone_number } else { "-" })
    if ($custPhone.Length -gt 20) { $custPhone = $custPhone.Substring(0, 20) }
    $city = [string]$(if ($order.city) { $order.city } elseif ($order.client_city) { $order.client_city } elseif ($order.customer_city) { $order.customer_city } else { "Hyderabad" })
    if ($city.Length -gt 14) { $city = $city.Substring(0, 14) }
    $age = [string]$(if ($order.customer_age) { $order.customer_age } elseif ($order.client_age) { $order.client_age } elseif ($order.age) { $order.age } else { "--" })

    $pDate = "--"
    $pTime = "--"
    $pickupRaw = if ($order.pickup_time) { $order.pickup_time } elseif ($order.pickupTime) { $order.pickupTime } else { $null }
    if ($pickupRaw) {
        try {
            $pDt = [DateTime]::Parse($pickupRaw)
            $pDate = $pDt.ToString("dd MMM yyyy")
            $pTime = $pDt.ToString("hh:mm tt")
        } catch {
            $pDate = [string]$pickupRaw
        }
    }

    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Name: $custName`n"))
    if ($custPhone -and $custPhone -ne "-") {
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Phone: $custPhone`n"))
    }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "City: $city" "Age: $age")))
    $isWebOrder = $false
    if ($order.source -eq "website" -or $order.source -eq "WEBSITE") { $isWebOrder = $true }
    elseif ($order.channel -eq "ONLINE" -or $order.channel -eq "WEBSITE") { $isWebOrder = $true }
    else {
        $rawRefUpper = [string]$(if ($order.order_number) { $order.order_number } elseif ($order.id) { $order.id } else { "" }).ToUpper()
        if ($rawRefUpper -match "-WEB-" -or $rawRefUpper -match "ONLINE") { $isWebOrder = $true }
    }
    if ($isWebOrder) {
        $delDate = if ($pickupRaw -and $pDate -ne "--") { $pDate } else { "--" }
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Delivery Date:" $delDate)))
    }

    # 7. Dashed line
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 8. Table header: ITEM | QTY | RATE | TOTAL, then dashed line
    $itemColW = [Math]::Max(10, $COLS - 17)
    $hdr = "ITEM".PadRight($itemColW) + " " + "QTY".PadLeft(3) + " " + "RATE".PadLeft(5) + " " + "TOTAL".PadLeft(6) + "`n"
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($hdr))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 9. Item rows (item name on left, QTY / RATE / TOTAL right-aligned)
    $rawItems = $order.items
    if ($rawItems -is [string]) {
        try { $rawItems = $rawItems | ConvertFrom-Json } catch { $rawItems = @() }
    }
    if (-not $rawItems -or $rawItems.Count -eq 0) {
        $rawItems = @(@{ product_name = "Optical Frame"; quantity = 1; unit_price = $(if ($order.total) { $order.total } else { 0 }) })
    }

    foreach ($it in $rawItems) {
        $name = [string]$(if ($it.product_name) { $it.product_name } elseif ($it.name) { $it.name } elseif ($it.model) { $it.model } else { "Frame" })
        $qty = if ($it.quantity) { [int]$it.quantity } else { 1 }
        $unitPrice = if ($it.unit_price_inr -ne $null) { [double]$it.unit_price_inr } `
                     elseif ($it.unit_price_paise -ne $null) { [double]$it.unit_price_paise / 100 } `
                     elseif ($it.priceINR -ne $null) { [double]$it.priceINR } `
                     elseif ($it.unit_price -ne $null) { [double]$it.unit_price } `
                     else { 0.0 }
        $lineTotal = if ($it.subtotal_inr -ne $null) { [double]$it.subtotal_inr } `
                     elseif ($it.subtotal_paise -ne $null) { [double]$it.subtotal_paise / 100 } `
                     elseif ($it.lineTotalINR -ne $null) { [double]$it.lineTotalINR } `
                     else { $unitPrice * $qty }

        $colsStr = " " + ([string]$qty).PadLeft(3) + " " + (Format-Num $unitPrice).PadLeft(5) + " " + (Format-Num $lineTotal).PadLeft(6) + "`n"
        if ($name.Length -le $itemColW) {
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($name.PadRight($itemColW) + $colsStr))
        } else {
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($name + "`n"))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes((" " * $itemColW) + $colsStr))
        }
    }

    # 10. Dashed line
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 11. Right-aligned: Total, Discount, Advance, 2nd Amount, 3rd Amount, dashed line, Remaining
    $grandTotal = if ($order.total_payable_inr) { [double]$order.total_payable_inr } `
                  elseif ($order.total_payable_paise) { [double]$order.total_payable_paise / 100 } `
                  elseif ($order.grand_total) { [double]$order.grand_total } `
                  elseif ($order.total) { [double]$order.total } `
                  else { 0.0 }
    $discount = if ($order.discount_inr) { [double]$order.discount_inr } `
                elseif ($order.discount_paise) { [double]$order.discount_paise / 100 } `
                else { 0.0 }
    $second = if ($order.second_payment_inr) { [double]$order.second_payment_inr } `
              elseif ($order.second_payment_paise) { [double]$order.second_payment_paise / 100 } `
              else { 0.0 }
    $third = if ($order.third_payment_inr) { [double]$order.third_payment_inr } `
             elseif ($order.third_payment_paise) { [double]$order.third_payment_paise / 100 } `
             else { 0.0 }
    $totalPaid = if ($order.amount_paid_inr -ne $null) { [double]$order.amount_paid_inr } `
                 elseif ($order.amount_paid_paise) { [double]$order.amount_paid_paise / 100 } `
                 else { 0.0 }
    $advance = if ($order.advance_paid_inr) { [double]$order.advance_paid_inr } `
               elseif ($order.advance_paid_paise) { [double]$order.advance_paid_paise / 100 } `
               else { [Math]::Max(0.0, $totalPaid - $second - $third) }
    $remaining = if ($order.outstanding_inr -ne $null) { [double]$order.outstanding_inr } `
                 elseif ($order.outstanding_paise -ne $null) { [double]$order.outstanding_paise / 100 } `
                 else { [Math]::Max(0.0, $grandTotal - ($advance + $second + $third)) }

    function Format-FinRow($lbl, $val) {
        $l = [string]$lbl
        $v = if ($val -ne $null -and [string]$val -ne "") { Format-Num $val } else { "" }
        $line = $l.PadLeft(16) + "  " + $v.PadLeft(8)
        return $line.PadLeft($COLS) + "`n"
    }

    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Format-FinRow "Total:" $grandTotal)))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Format-FinRow "Discount:" $discount)))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Format-FinRow "Advance:" $advance)))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Format-FinRow "2nd Amount:" $(if ($second -gt 0) { $second } else { "" }))))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Format-FinRow "3rd Amount:" $(if ($third -gt 0) { $third } else { "" }))))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Format-FinRow "Remaining:" $remaining)))
    if ($remaining -eq 0) {
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Center-Text "*** PAID IN FULL ***`n")))
    }

    # 12. Dashed line
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 13. PRESCRIPTION block
    $allRxList = @()
    if ($order.prescriptions) {
        $rawPresc = $order.prescriptions
        if ($rawPresc -is [string]) {
            try { $rawPresc = $rawPresc | ConvertFrom-Json } catch {}
        }
        foreach ($p in $rawPresc) { if ($p) { $allRxList += $p } }
    } elseif ($order.prescriptions_json) {
        try {
            $rawPresc = $order.prescriptions_json | ConvertFrom-Json
            foreach ($p in $rawPresc) { if ($p) { $allRxList += $p } }
        } catch {}
    }
    if ($allRxList.Count -eq 0) {
        if ($order.items) {
            foreach ($it in $order.items) {
                if ($it) {
                    $itemRx = if ($it.prescription) { $it.prescription } elseif ($it.rx) { $it.rx } else { $null }
                    if ($itemRx) {
                        if ($itemRx -is [string] -and $itemRx.Trim().StartsWith("{")) {
                            try { $allRxList += ($itemRx | ConvertFrom-Json) } catch { $allRxList += $itemRx }
                        } else {
                            $allRxList += $itemRx
                        }
                    }
                }
            }
        }
    }
    if ($allRxList.Count -eq 0) {
        if ($order.prescription) { $allRxList += $order.prescription }
        elseif ($order.client_prescription) { $allRxList += $order.client_prescription }
        elseif ($order.newPrescription) { $allRxList += $order.newPrescription }
        elseif ($order.od_sph -ne $null -or $order.os_sph -ne $null) { $allRxList += $order }
    }

    function Format-DiopterVal($val) {
        if ($val -eq $null -or [string]$val -eq "" -or [string]$val -eq "--" -or [string]$val -eq "---") { return "--" }
        $str = [string]$val
        $num = 0.0
        if ([double]::TryParse($str, [ref]$num)) {
            if ($num -eq 0) { return "0.00" }
            return "{0:+0.00;-0.00;0.00}" -f $num
        }
        if ($str.Length -gt 6) { return $str.Substring(0, 6) }
        return $str
    }

    function Format-AxisVal($val) {
        if ($val -eq $null -or [string]$val -eq "" -or [string]$val -eq "--" -or [string]$val -eq "---") { return "--" }
        $str = [string]$val
        if ($str.Length -gt 6) { return $str.Substring(0, 6) }
        return $str
    }

    function Test-MeaningfulDiopters($rx) {
        if (-not $rx) { return $false }
        $fields = @($rx.od_sph, $rx.odSph, $rx.od_cyl, $rx.odCyl, $rx.od_axis, $rx.odAxis, $rx.os_sph, $rx.osSph, $rx.os_cyl, $rx.osCyl, $rx.os_axis, $rx.osAxis, $rx.addition, $rx.add)
        foreach ($v in $fields) {
            if ($v -ne $null) {
                $str = [string]$v
                $trimmed = $str.Trim()
                if ($trimmed -ne "" -and $trimmed -ne "--" -and $trimmed -ne "---" -and $trimmed -ne "0" -and $trimmed -ne "0.0" -and $trimmed -ne "0.00" -and $trimmed -ne "+0.00" -and $trimmed -ne "-0.00") {
                    return $true
                }
            }
        }
        return $false
    }

    $validRxList = @()
    foreach ($r in $allRxList) {
        if (Test-MeaningfulDiopters $r) { $validRxList += $r }
    }

    if ($validRxList.Count -gt 0) {
        $rxIdx = 0
        foreach ($rx in $validRxList) {
            $rxIdx++
            $getRxVal = {
                param($keys)
                foreach ($k in $keys) {
                    if ($rx -and $rx.$k -ne $null -and [string]$rx.$k -ne "" -and [string]$rx.$k -ne "---") { return $rx.$k }
                    if ($order -and $order.$k -ne $null -and [string]$order.$k -ne "" -and [string]$order.$k -ne "---") { return $order.$k }
                }
                return $null
            }

            $rxNo = & $getRxVal @('prescription_number', 'prescriptionNumber', 'prescription_id', 'id')
            if (-not $rxNo) { $rxNo = $(if ($order.prescription_number) { $order.prescription_number } else { $rxIdx }) }
            $odSph = & $getRxVal @('od_sph', 'odSph')
            $odCyl = & $getRxVal @('od_cyl', 'odCyl')
            $odAxis = & $getRxVal @('od_axis', 'odAxis')
            $osSph = & $getRxVal @('os_sph', 'osSph')
            $osCyl = & $getRxVal @('os_cyl', 'osCyl')
            $osAxis = & $getRxVal @('os_axis', 'osAxis')
            $addition = & $getRxVal @('addition', 'add')

            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("RX# $rxNo`n"))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes((" " * 11) + "SPH".PadLeft(7) + "CYL".PadLeft(7) + "AXIS".PadLeft(7) + "`n"))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OD Right".PadRight(11) + (Format-DiopterVal $odSph).PadLeft(7) + (Format-DiopterVal $odCyl).PadLeft(7) + (Format-AxisVal $odAxis).PadLeft(7) + "`n"))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OS Left".PadRight(11) + (Format-DiopterVal $osSph).PadLeft(7) + (Format-DiopterVal $osCyl).PadLeft(7) + (Format-AxisVal $osAxis).PadLeft(7) + "`n"))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Addition".PadRight(11) + (Format-DiopterVal $addition).PadLeft(7) + "`n"))
        }
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
    } else {
        if ($order.prescription_pref -ne "zero-power") {
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Center-Text "RX: Zero Power`n")))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
        }
    }

    # 15. "Thanks for Shopping" (centered)
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Thanks for Shopping`n"))

    # 16. Payment QR code (centered)
    $QrRasterFile = Join-Path $ScriptDir "assets\payment_qr_raster.bin"
    if (Test-Path $QrRasterFile) {
        $qrBytes = [System.IO.File]::ReadAllBytes($QrRasterFile)
        $bw.Write($qrBytes)
    }

    # 17. The UPI ID printed as text directly underneath the QR, centered.
    $activeUpiId = if ($Config.storeUpiId) { $Config.storeUpiId } elseif ($Config.upiId) { $Config.upiId } else { $UPI_ID }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("$activeUpiId`n"))

    # 18. Small bottom feed so the paper can be torn cleanly.
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("`n`n`n"))
    $bw.Write([byte[]]@(0x1D, 0x56, 0x41, 0x03)) # Full cut

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


# -- LIVE PRINTING CONTROLLER (Dual-Channel Direct + Cloud Queue) ----------------
$daemonStartTime = [DateTime]::UtcNow
$printedFile = Join-Path $ScriptDir ".printed_orders.json"
$livePrintedOrders = [System.Collections.Generic.HashSet[string]]::new()
$processedJobIds = [System.Collections.Generic.HashSet[string]]::new()

if (Test-Path $printedFile) {
    try {
        $loaded = Get-Content $printedFile -Raw | ConvertFrom-Json
        if ($loaded) {
            foreach ($item in $loaded) {
                if ($item) {
                    $livePrintedOrders.Add([string]$item) | Out-Null
                    $processedJobIds.Add([string]$item) | Out-Null
                }
            }
        }
    } catch {}
}

function Save-PrintedOrdersState {
    try {
        $all = @($livePrintedOrders) + @($processedJobIds) | Select-Object -Unique
        if ($all.Count -gt 300) { $all = $all[-300..-1] }
        $all | ConvertTo-Json | Set-Content $printedFile -Encoding UTF8 -Force
    } catch {}
}

function Format-QrStickerBytes($it) {
    return Format-StickerBytes @($it)
}

function Poll-CloudPrintQueue {
    if (-not $Config.supabaseUrl -or -not $Config.supabaseAnonKey) { return }
    try {
        $headers = @{
            "apikey" = $Config.supabaseAnonKey
            "Authorization" = "Bearer " + $Config.supabaseAnonKey
        }
        $url = $Config.supabaseUrl + "/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE&select=notes"
        $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($res -and $res.Count -gt 0 -and $res[0].notes) {
            $parsed = $res[0].notes | ConvertFrom-Json
            if ($parsed -and $parsed.jobs) {
                foreach ($job in $parsed.jobs) {
                    if (-not $job -or -not $job.id) { continue }
                    $jobId = [string]$job.id
                    if ($processedJobIds.Contains($jobId)) { continue }

                    # Mark processed immediately to prevent retry loops
                    $processedJobIds.Add($jobId) | Out-Null
                    Save-PrintedOrdersState

                    if ($job.type -eq "qr_sticker") {
                        $items = if ($job.items) { $job.items } else { @($job) }
                        foreach ($it in $items) {
                            $copies = if ($it.copies) { [int]$it.copies } else { 1 }
                            for ($c = 0; $c -lt $copies; $c++) {
                                $skuLabel = if ($it.sku) { $it.sku } else { $it.name }
                                Write-DaemonLog "[Cloud Queue] 🏷️ Printing QR Sticker for $skuLabel..." "INFO"
                                try {
                                    $bytes = Format-StickerBytes @($it)
                                    if ($bytes -and $bytes.Length -gt 0) {
                                        $spoolOk = Spool-Bytes $bytes "Sticker-$skuLabel"
                                        if ($spoolOk) {
                                            Write-DaemonLog "[Cloud Queue] ✅ Sticker $skuLabel printed to $($Config.printerName)!" "INFO"
                                        } else {
                                            Write-DaemonLog "[Cloud Queue] ❌ Spooling failed for sticker $skuLabel" "WARN"
                                        }
                                    }
                                } catch {
                                    Write-DaemonLog "[Cloud Queue] Error formatting sticker: $_" "WARN"
                                }
                            }
                        }
                    } elseif ($job.type -eq "receipt") {
                        $order = if ($job.order) { $job.order } elseif ($job.items -and $job.items[0] -and $job.items[0].order) { $job.items[0].order } else { $null }
                        if (-not $order -or (-not $order.order_number -and -not $order.order_ref -and -not $order.id)) {
                            Write-DaemonLog "[Cloud Queue] Discarding malformed or dummy receipt job #$jobId" "INFO"
                            continue
                        }
                        $ref = if ($order.order_number) { [string]$order.order_number } elseif ($order.order_ref) { [string]$order.order_ref } elseif ($order.id) { [string]$order.id } else { "BILL" }
                        $orderIdStr = if ($order.id) { [string]$order.id } else { "" }
                        $isReprint = ($job.source -eq "reprint" -or $job.manualReprint -eq $true)
                        $stageKey = if ($isReprint) { "reprint_" + $jobId } `
                                    elseif ($order.third_payment_inr -gt 0 -or $order.third_payment_paise -gt 0) { $ref + ":stage3" } `
                                    elseif ($order.second_payment_inr -gt 0 -or $order.second_payment_paise -gt 0) { $ref + ":stage2" } `
                                    else { $ref + ":init" }

                        if (-not $isReprint -and ($livePrintedOrders.Contains($stageKey) -or $History.ContainsKey($stageKey))) {
                            Write-DaemonLog "[Cloud Queue] Bill #$ref ($stageKey) already printed. Skipping duplicate." "INFO"
                            continue
                        }
                        Write-DaemonLog "[Cloud Queue] 🖨️ Printing Bill #$ref ($stageKey)..." "INFO"
                        try {
                            $bytes = Format-ReceiptBytes $order
                            if ($bytes -and $bytes.Length -gt 0) {
                                $ok = Spool-Bytes $bytes "Bill-$ref"
                                if ($ok) {
                                    $livePrintedOrders.Add($stageKey) | Out-Null
                                    if ($ref) { $livePrintedOrders.Add($ref) | Out-Null }
                                    if ($orderIdStr) { $livePrintedOrders.Add($orderIdStr) | Out-Null }
                                    $nowIso = (Get-Date).ToString("o")
                                    $History[$stageKey] = $nowIso
                                    $History[$ref] = $nowIso
                                    if ($orderIdStr) { $History[$orderIdStr] = $nowIso }
                                    Save-PrintedOrdersState
                                    Save-History
                                    Write-DaemonLog "[Cloud Queue] ✅ SUCCESS: Bill #$ref ($stageKey) printed to $($Config.printerName)!" "INFO"
                                }
                            }
                        } catch {
                            Write-DaemonLog "[Cloud Queue] Error printing bill: $_" "WARN"
                        }
                    }
                }
            }
        }
    } catch {
        Write-DaemonLog "[Cloud Queue] Poll error: $_" "WARN"
    }
}

$firstCloudPollDone = $false
function Poll-LiveCloudOrders {
    if (-not $Config.supabaseUrl -or -not $Config.supabaseAnonKey) { return }
    try {
        $headers = @{
            "apikey" = $Config.supabaseAnonKey
            "Authorization" = "Bearer " + $Config.supabaseAnonKey
        }
        $since = [DateTime]::UtcNow.AddMinutes(-30).ToString("yyyy-MM-ddTHH:mm:ssZ")
        $url = $Config.supabaseUrl + "/rest/v1/orders?created_at=gte." + $since + "&order=created_at.desc&limit=15"
        $orders = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
        if ($orders -and $orders.Count -gt 0) {
            # On startup: acknowledge existing orders so no missed/old orders are printed!
            if (-not $script:firstCloudPollDone) {
                $script:firstCloudPollDone = $true
                foreach ($ord in $orders) {
                    $ref = if ($ord.order_number) { [string]$ord.order_number } elseif ($ord.order_ref) { [string]$ord.order_ref } else { [string]$ord.id }
                    if ($ref) { $livePrintedOrders.Add($ref) | Out-Null }
                }
                Write-DaemonLog "[Cloud Sync] Initialized. Acknowledged $($orders.Count) existing orders (zero backlog replay). Listening for new live orders!" "INFO"
                return
            }

            # Subsequent live polls: print newly placed verified website orders!
            # (In-store POS orders are NEVER printed from raw /orders table because installment details live in SYS-PRINT-QUEUE)
            foreach ($ord in $orders) {
                $ref = if ($ord.order_number) { [string]$ord.order_number } elseif ($ord.order_ref) { [string]$ord.order_ref } else { [string]$ord.id }
                if (-not $ref -or $livePrintedOrders.Contains($ref)) { continue }

                # In-store POS bills are handled exclusively with full installment breakdown via SYS-PRINT-QUEUE
                if ($ref -like "*NOOR-POS-*" -or $ord.channel -eq "POS" -or $ord.channel_code -eq 2 -or $ord.source -eq "instore") {
                    continue
                }
                # Website orders only print after payment is verified by staff
                if ($ord.payment_status -ne "VERIFIED") {
                    continue
                }

                Write-DaemonLog "[Live Cloud] Printing Live Website Order #$ref..." "INFO"
                $bytes = Format-ReceiptBytes $ord
                $ok = Spool-Bytes $bytes "Bill-$ref"
                if ($ok) {
                    $livePrintedOrders.Add($ref) | Out-Null
                    Save-PrintedOrdersState
                    Write-DaemonLog "[Live Cloud] SUCCESS: Website Bill #$ref printed to $($Config.printerName)!" "INFO"
                }
            }
        }
    } catch {}
}

Write-DaemonLog "[Cloud Sync] Live order monitoring ACTIVE (Checking new orders created after startup)"
Write-DaemonLog "[Cloud Sync] Mode: LIVE-ONLY (Zero Backlog Replay, Instant Print)"

$running = $true
$asyncResult = $listener.BeginGetContext($null, $null)
$lastQueuePoll = 0
$lastLivePoll = 0

while ($running) {
    try {
        # 1. Process incoming local POS HTTP requests (Non-blocking)
        if ($asyncResult.IsCompleted) {
            $context = $listener.EndGetContext($asyncResult)
            $asyncResult = $listener.BeginGetContext($null, $null)

            $request = $context.Request
            $response = $context.Response

            $origin = if ($request.Headers["Origin"]) { $request.Headers["Origin"] } else { "*" }
            $response.AddHeader("Access-Control-Allow-Origin", $origin)
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
            $response.AddHeader("Access-Control-Allow-Private-Network", "true")

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
                    autonomousCloudSync = $true
                }
                $buf = [System.Text.Encoding]::UTF8.GetBytes(($statusObj | ConvertTo-Json))
                $response.ContentType = "application/json"
                $response.ContentLength64 = $buf.Length
                $response.OutputStream.Write($buf, 0, $buf.Length)
                $response.Close()
                continue
            }

            # 2. POST /api/print (In-Store Checkout or Manual Reprint)
            if ($request.HttpMethod -eq "POST" -and $path -eq "/api/print") {
                $reader = New-Object System.IO.StreamReader($request.InputStream, $request.ContentEncoding)
                $body = $reader.ReadToEnd()
                $reader.Close()

                $payload = $body | ConvertFrom-Json
                $order = if ($payload.order) { $payload.order } else { $payload }
                $orderRef = if ($order.order_number) { $order.order_number } elseif ($order.order_ref) { $order.order_ref } else { $order.id }
                $isManual = if ($payload.manualReprint) { [bool]$payload.manualReprint } else { $false }

                $refs = @($order.order_number, $order.order_ref, $order.orderNumber, [string]$order.id) | Where-Object { $_ -ne $null -and $_ -ne "" }

                # Check duplicate suppression if automatic print
                $alreadyPrinted = $false
                if (-not $isManual) {
                    foreach ($r in $refs) {
                        if ($History.ContainsKey($r) -and $History[$r] -ne "SKIPPED_STALE") {
                            $alreadyPrinted = $true
                            break
                        }
                    }
                }

                if ($alreadyPrinted) {
                    Write-DaemonLog "[Daemon] Order #$orderRef was already printed. Suppressing duplicate."
                    $resObj = @{ success = $true; skippedDuplicate = $true; orderNumber = $orderRef }
                } else {
                    Write-DaemonLog "Printing 2.5-inch receipt for order #$orderRef (manualReprint: $isManual)..."
                    $bytes = Format-ReceiptBytes $order
                    $ok = Spool-Bytes $bytes "Bill-$orderRef"
                    if ($ok) {
                        $nowIso = (Get-Date).ToString("o")
                        foreach ($r in $refs) { $History[$r] = $nowIso }
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
                $rawItems = @()
                if ($payload.items) {
                    $rawItems = @($payload.items)
                } else {
                    $rawItems = @($payload)
                }
                Write-DaemonLog "Received QR Sticker print request for $($rawItems.Count) frame(s)..."

                $combined = Format-StickerBytes $rawItems
                $ok = Spool-Bytes $combined "QR-Sticker"
                $statusMsg = "Spooler failure"
                if ($ok) { $statusMsg = "Sticker(s) printed successfully!" }
                $resObj = @{ success = $ok; count = $rawItems.Count; message = $statusMsg }
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
                $testMsg = "Spooler failed"
                if ($ok) { $testMsg = "Test receipt printed!" }
                $resObj = @{ success = $ok; message = $testMsg }
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
        }

        # 2. Fast Cloud Print Queue Poll (Every 1 second for instant printing on dedicated laptop)
        $nowEpoch = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        if ($nowEpoch - $lastQueuePoll -ge 1) {
            $lastQueuePoll = $nowEpoch
            Poll-CloudPrintQueue
        }

        # 3. Background Website Order Check (Every 10 seconds for online website orders only)
        if ($nowEpoch - $lastLivePoll -ge 10) {
            $lastLivePoll = $nowEpoch
            Poll-LiveCloudOrders
        }

        Start-Sleep -Milliseconds 100
    } catch {
        Write-DaemonLog "Daemon loop error: $_" "ERROR"
        Start-Sleep -Milliseconds 500
    }
}
