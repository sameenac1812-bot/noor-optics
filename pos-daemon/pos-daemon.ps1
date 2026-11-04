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

    # 1b. Print Noor Glasses Logo at Top (Tightly positioned above store name)
    $LogoRasterFile = Join-Path $ScriptDir "assets\logo_raster.bin"
    if (Test-Path $LogoRasterFile) {
        $logoBytes = [System.IO.File]::ReadAllBytes($LogoRasterFile)
        $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
        $bw.Write($logoBytes)
    }

    # 2. Header (NOOR OPTIC, Pillar No. 45, Rethibowli, Hyderabad, Telangana 500028)
    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([byte[]]@(0x1D, 0x21, 0x01)) # Double height
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("NOOR OPTIC`n"))
    $bw.Write([byte[]]@(0x1D, 0x21, 0x00)) # Normal
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Pillar No. 45, Rethibowli, Hyderabad, Telangana 500028`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Ph: $($Config.storePhone)`n"))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($doubleDivider))

    # Prominent In-Store vs Website Order Channel Banner
    $orderRefStr = [string]$(if ($order.order_number) { $order.order_number } elseif ($order.order_ref) { $order.order_ref } else { $order.id })
    $isPos = $orderRefStr -match "-POS-" -or $order.channel -eq "POS" -or $order.channel -eq "IN-STORE" -or ($order.delivery_address -and $order.delivery_address -match "pos|boutique|flagship|store|counter|rethibowli|walk-in")
    $channelLabel = if ($isPos) { "[IN-STORE POS]" } else { "[WEBSITE ORDER]" }
    $channelBanner = if ($isPos) { "*** IN-STORE BOUTIQUE SALE ***" } else { "*** ONLINE STOREFRONT ORDER ***" }

    $bw.Write([byte[]]@(0x1B, 0x61, 0x01)) # Center
    $bw.Write([byte[]]@(0x1B, 0x45, 0x01)) # Bold on
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes("$channelBanner`n"))
    $bw.Write([byte[]]@(0x1B, 0x45, 0x00)) # Bold off
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($doubleDivider))

    # 3. Invoice & Token
    $bw.Write([byte[]]@(0x1B, 0x61, 0x00)) # Left
    $tok = if ($order.token_number) { $order.token_number } elseif ($order.token) { $order.token } else { 1 }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "TOKEN #$tok" $channelLabel)))
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

    $rawItems = $order.items
    if ($rawItems -is [string]) {
        try { $rawItems = $rawItems | ConvertFrom-Json } catch { $rawItems = @() }
    }
    $itemCount = if ($rawItems) { $rawItems.Count } else { 0 }

    $grandT = if ($order.total_payable_inr) { [double]$order.total_payable_inr } `
              elseif ($order.grand_total) { [double]$order.grand_total } `
              elseif ($order.total) { [double]$order.total } `
              elseif ($order.total_payable_paise) { [double]$order.total_payable_paise / 100 } `
              else { 0.0 }
    $disc = if ($order.discount_inr) { [double]$order.discount_inr } `
            elseif ($order.discount_paise) { [double]$order.discount_paise / 100 } `
            elseif ($order.discount) { [double]$order.discount } `
            else { 0.0 }

    if ($itemCount -gt 0) {
        foreach ($it in $rawItems) {
            $qty = if ($it.quantity) { [int]$it.quantity } else { 1 }
            $price = if ($it.unit_price_inr -ne $null) { [double]$it.unit_price_inr } `
                     elseif ($it.unit_price_paise -ne $null) { [double]$it.unit_price_paise / 100 } `
                     elseif ($it.unitPricePaise -ne $null) { [double]$it.unitPricePaise / 100 } `
                     elseif ($it.pricePaise -ne $null) { [double]$it.pricePaise / 100 } `
                     elseif ($it.priceINR -ne $null) { [double]$it.priceINR } `
                     elseif ($it.unitPrice -ne $null) { [double]$it.unitPrice } `
                     elseif ($it.unit_price -ne $null) { [double]$it.unit_price } `
                     else { 0.0 }

            $name = if ($it.product_name) { [string]$it.product_name } `
                    elseif ($it.name) { [string]$it.name } `
                    elseif ($it.model) { [string]$it.model } `
                    elseif ($it.sku) { [string]$it.sku } `
                    else { "" }

            $vId = if ($it.variantId) { [string]$it.variantId } elseif ($it.id) { [string]$it.id } else { "" }
            if (-not $name -or $name -eq "Optical Frame" -or $name -eq "Frame") {
                if ($vId -match "1793298868419|1793380443146" -or $it.sku -match "BATMAN" -or ($price -ge 50000 -and $price -le 60000)) {
                    $name = "meta glasses meta"
                    if (-not $it.sku) { $it | Add-Member -NotePropertyName "sku" -NotePropertyValue "NOOR BATMAN" -Force }
                } elseif ($vId -match "1793380282448" -or $it.sku -match "GOLD" -or ($price -ge 12000 -and $price -le 13000)) {
                    $name = "RayBan Aviator Gold"
                    if (-not $it.sku) { $it | Add-Member -NotePropertyName "sku" -NotePropertyValue "NOOR-RB-GOLD-2425" -Force }
                } elseif ($vId -match "noor-01") { $name = "The Stockholm Noir" }
                elseif ($vId -match "noor-02") { $name = "The Copenhagen Round" }
                elseif ($vId -match "noor-03") { $name = "The Oslo Crystal" }
                elseif ($vId -match "noor-04") { $name = "The Kyoto Havana" }
                elseif ($vId -match "noor-05") { $name = "The Milan Aureum" }
                elseif ($vId -match "noor-06") { $name = "The Zurich Titanium" }
                elseif ($vId -match "noor-07") { $name = "The Berlin Hex" }
                elseif ($vId -match "noor-08") { $name = "The Helsinki Quad" }
                elseif ($vId -match "noor-09") { $name = "The Reykjavik Pilot" }
                elseif ($vId -match "noor-10") { $name = "The Vienna Silhouette" }
                elseif ($vId -match "noor-11") { $name = "The Amber Arch" }
                elseif ($vId -match "noor-12") { $name = "The Tokyo Steel" }
                elseif ($it.sku) { $name = [string]$it.sku }
                elseif ($order.frame_name) { $name = [string]$order.frame_name }
                elseif ($order.product_name) { $name = [string]$order.product_name }
                else { $name = "Noor Optical Frame" }
            }

            $tot = if ($it.subtotal_inr -ne $null) { [double]$it.subtotal_inr } `
                   elseif ($it.subtotal_paise -ne $null) { [double]$it.subtotal_paise / 100 } `
                   elseif ($it.subtotalPaise -ne $null) { [double]$it.subtotalPaise / 100 } `
                   elseif ($it.subtotal -ne $null -and [double]$it.subtotal -gt 0) { [double]$it.subtotal } `
                   else { $price * $qty }

            if ($tot -eq 0 -and $grandT -gt 0 -and $itemCount -eq 1) {
                $tot = $grandT
            }

            $cleanName = if ($name.Length -gt 18) { $name.Substring(0, 18) } else { $name }
            $line = Row-Text $cleanName "$qty  Rs.$([Math]::Round($tot))"
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($line))
            if ($it.sku -and $it.sku -ne $name) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" SKU:   $($it.sku)`n"))
            }
            if ($it.variant_name) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Color: $($it.variant_name)`n"))
            } elseif ($it.color) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Color: $($it.color)`n"))
            }
            if ($it.lens_name -and $it.lens_name -notmatch "standard") {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Lens:  $($it.lens_name)`n"))
            } elseif ($it.lens -and $it.lens -notmatch "standard") {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Lens:  $($it.lens)`n"))
            }
        }
    } else {
        $fallbackPrice = if ($grandT -gt 0) { $grandT } else { 0.0 }
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Noor Optical Frame" "1  Rs.$([Math]::Round($fallbackPrice))")))
    }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 6. Financial Breakdown (NO GST / NO GSTIN / NO TAX lines)
    $sub = if ($order.subtotal_inr -ne $null) { [double]$order.subtotal_inr } `
           elseif ($order.subtotal_paise -ne $null) { [double]$order.subtotal_paise / 100 } `
           elseif ($order.subtotal -ne $null -and [double]$order.subtotal -gt 0) { [double]$order.subtotal } `
           else { 0.0 }
    if ($sub -eq 0 -and $grandT -gt 0) {
        $sub = $grandT + $disc
    }

    $paid = if ($order.amount_paid_inr) { [double]$order.amount_paid_inr } `
            elseif ($order.amount_paid_paise) { [double]$order.amount_paid_paise / 100 } `
            else { $grandT }
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
    $balText = "Rs.0 (PAID)"
    if ($bal -gt 0) { $balText = "Rs.$([Math]::Round($bal))" }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Balance Due:" $balText)))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 7. Prescription Extraction (Multi-Rx Support)
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

    if ($allRxList.Count -eq 0 -and $order.items) {
        $rawIts = $order.items
        if ($rawIts -is [string]) {
            try { $rawIts = $rawIts | ConvertFrom-Json } catch {}
        }
        if ($rawIts) {
            foreach ($it in $rawIts) {
                if ($it.prescription) { $allRxList += $it.prescription }
                elseif ($it.rx) { $allRxList += $it.rx }
            }
        }
    }

    if ($allRxList.Count -eq 0) {
        if ($order.prescription) { $allRxList += $order.prescription }
        elseif ($order.newPrescription) { $allRxList += $order.newPrescription }
        else { $allRxList += $order }
    }

    function Format-Diopter($val) {
        if ($val -eq $null -or [string]$val -eq "" -or [string]$val -eq "-" -or [string]$val -eq "---") { return "  --- " }
        $str = [string]$val
        $num = 0.0
        if ([double]::TryParse($str, [ref]$num)) {
            if ($num -eq 0) { return "  0.00" }
            return "{0:+0.00;-0.00; 0.00}" -f $num
        }
        return "{0,6}" -f $str
    }

    $printedAnyRx = $false
    $rxIndex = 0
    foreach ($rx in $allRxList) {
        $rxIndex++
        $getRxVal = {
            param($keys)
            foreach ($k in $keys) {
                if ($rx -and $rx.$k -ne $null -and [string]$rx.$k -ne "" -and [string]$rx.$k -ne "---") { return $rx.$k }
                if ($order -and $order.$k -ne $null -and [string]$order.$k -ne "" -and [string]$order.$k -ne "---") { return $order.$k }
            }
            return $null
        }

        $odSphV = & $getRxVal @('od_sph', 'odSph')
        $odCylV = & $getRxVal @('od_cyl', 'odCyl')
        $odAxV  = & $getRxVal @('od_axis', 'odAxis')
        $osSphV = & $getRxVal @('os_sph', 'osSph')
        $osCylV = & $getRxVal @('os_cyl', 'osCyl')
        $osAxV  = & $getRxVal @('os_axis', 'osAxis')
        $addRaw = & $getRxVal @('addition', 'add')
        $pdVal  = & $getRxVal @('ipd_distance', 'ipdDistance', 'pd')
        $docVal = & $getRxVal @('checked_by', 'checkedBy', 'rx_checked_by')
        $prescriberVal = & $getRxVal @('prescriber_details', 'prescriberDetails', 'clinic')
        $rxNotesVal = & $getRxVal @('notes', 'rx_notes')

        $hasAnyRx = ($odSphV -ne $null) -or ($odCylV -ne $null) -or ($odAxV -ne $null) -or `
                    ($osSphV -ne $null) -or ($osCylV -ne $null) -or ($osAxV -ne $null) -or `
                    ($addRaw -ne $null) -or ($pdVal -ne $null)

        if ($hasAnyRx) {
            $printedAnyRx = $true
            $hdr = if ($allRxList.Count -gt 1) { "--- CLIENT PRESCRIPTION #$rxIndex ---`n" } else { "--- CLIENT PRESCRIPTION (RX) ---`n" }
            $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
            $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($hdr))
            $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
            $bw.Write([byte[]]@(0x1B, 0x61, 0x00))

            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Eye    SPH    CYL   AXIS   ADD  `n"))
            $odS = Format-Diopter $odSphV
            $odC = Format-Diopter $odCylV
            $odA = if ($odAxV) { "{0,3}" -f $odAxV } else { "---" }
            $add = if ($addRaw) { Format-Diopter $addRaw } else { " --- " }
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OD   $odS  $odC   $odA  $add`n"))

            $osS = Format-Diopter $osSphV
            $osC = Format-Diopter $osCylV
            $osA = if ($osAxV) { "{0,3}" -f $osAxV } else { "---" }
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OS   $osS  $osC   $osA  $add`n"))

            if ($pdVal) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Distance PD: $pdVal mm`n"))
            }
            if ($docVal) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Optometrist: $docVal`n"))
            }
            if ($prescriberVal) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Prescriber:  $prescriberVal`n"))
            }
            if ($rxNotesVal -and $rxNotesVal -notmatch "in-store") {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Rx Notes:    $rxNotesVal`n"))
            }
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
        }
    }

    $pref = [string]$order.prescription_pref
    $isZeroPower = $pref -match "zero|plano|blue|screen"
    $isCallOptometrist = $pref -match "call|optometrist|consult"
    $isManualRx = $pref -match "enter|manual"
    $rxMentioned = ($order.prescription_id) -or ($order.prescription_number) -or ($pref -match "rx") -or $isManualRx

    if (-not $printedAnyRx) {
        if ($isZeroPower) {
            # Website Case 1 - Choice 3: Zero Power Blue-Cut Lenses
            $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
            $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--- CLIENT PRESCRIPTION (RX) ---`n"))
            $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("ZERO-POWER (PLANO) LENSES`n"))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Blue-Cut Anti-Glare Computer Vision`n"))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
        } elseif ($isCallOptometrist) {
            # Website Case 1 - Choice 2: Call Optometrist Required
            $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
            $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--- CLIENT PRESCRIPTION (RX) ---`n"))
            $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OPTOMETRIST CALL REQUIRED`n"))
            if ($order.customer_phone) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Call Client: $($order.customer_phone)`n"))
            }
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
        } elseif ($rxMentioned) {
            # Website Case 1 - Choice 1: Manual prescription not filled or awaiting upload
            $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
            $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--- CLIENT PRESCRIPTION (RX) ---`n"))
            $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("PRESCRIPTION PENDING VERIFICATION`n"))
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))
        }
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
        $res = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 4 -ErrorAction SilentlyContinue
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
                        $order = if ($job.order) { $job.order } else { $job }
                        $ref = if ($order.order_number) { [string]$order.order_number } else { [string]$order.order_ref }
                        if ($ref -and -not $livePrintedOrders.Contains($ref)) {
                            Write-DaemonLog "[Cloud Queue] 🖨️ Printing Bill #$ref..." "INFO"
                            try {
                                $bytes = Format-ReceiptBytes $order
                                if ($bytes -and $bytes.Length -gt 0) {
                                    $ok = Spool-Bytes $bytes "Bill-$ref"
                                    if ($ok) {
                                        $livePrintedOrders.Add($ref) | Out-Null
                                        Save-PrintedOrdersState
                                        Write-DaemonLog "[Cloud Queue] ✅ SUCCESS: Bill #$ref printed to $($Config.printerName)!" "INFO"
                                    }
                                }
                            } catch {
                                Write-DaemonLog "[Cloud Queue] Error printing bill: $_" "WARN"
                            }
                        }
                    }
                }
            }
        }
    } catch {
        Write-DaemonLog "[Cloud Queue] Poll error: $_" "WARN"
    }
}

function Poll-LiveCloudOrders {
    if (-not $Config.supabaseUrl -or -not $Config.supabaseAnonKey) { return }
    try {
        $headers = @{
            "apikey" = $Config.supabaseAnonKey
            "Authorization" = "Bearer " + $Config.supabaseAnonKey
        }
        $since = [DateTime]::UtcNow.AddMinutes(-30).ToString("yyyy-MM-ddTHH:mm:ssZ")
        $url = $Config.supabaseUrl + "/rest/v1/orders?status=eq.confirmed&created_at=gte." + $since + "&order=created_at.asc&limit=10"
        $orders = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($orders -and $orders.Count -gt 0) {
            foreach ($ord in $orders) {
                $ref = if ($ord.order_number) { [string]$ord.order_number } else { [string]$ord.order_ref }
                if (-not $ref -or $livePrintedOrders.Contains($ref)) { continue }

                # Wait for staff approval if website UPI order
                $isWeb = ($ord.source -eq "website" -or $ord.channel -eq "WEBSITE")
                $isAwaiting = ($ord.payment_status -eq "AWAITING_VERIFICATION" -or $ord.status -eq "PENDING_VERIFICATION")
                if ($isWeb -and $isAwaiting) { continue }

                Write-DaemonLog "[Live Cloud] Printing Live Order #$ref..." "INFO"
                $bytes = Format-ReceiptBytes $ord
                $ok = Spool-Bytes $bytes "Bill-$ref"
                if ($ok) {
                    $livePrintedOrders.Add($ref) | Out-Null
                    Save-PrintedOrdersState
                    Write-DaemonLog "[Live Cloud] SUCCESS: Bill #$ref printed to $($Config.printerName)!" "INFO"
                }
            }
        }
    } catch {}
}

Write-DaemonLog "[Cloud Sync] Live order monitoring ACTIVE (Checking new orders created after startup)"
Write-DaemonLog "[Cloud Sync] Mode: LIVE-ONLY (Zero Backlog Replay, Instant Print)"

$running = $true
$asyncResult = $listener.BeginGetContext($null, $null)
$lastCloudPoll = 0

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

        # 2. Live Cloud Order Check (Every 3 seconds for new orders created after startup)
        $nowEpoch = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        if ($nowEpoch - $lastCloudPoll -ge 3) {
            $lastCloudPoll = $nowEpoch
            Poll-LiveCloudOrders
            Poll-CloudPrintQueue
        }

        Start-Sleep -Milliseconds 150
    } catch {
        Write-DaemonLog "Daemon loop error: $_" "ERROR"
        Start-Sleep -Milliseconds 500
    }
}
