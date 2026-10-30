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
    orderFreshnessMinutes = 45
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
        # 1. Generate 2D QR Code Bitmap
        $qrBmp = $null
        $dll = Join-Path $ScriptDir "assets\QRCoder.dll"
        if (Test-Path $dll) {
            try {
                Unblock-File -Path $dll -ErrorAction SilentlyContinue
                Add-Type -Path $dll -ErrorAction SilentlyContinue
                Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
                $gen = New-Object QRCoder.QRCodeGenerator
                $data = $gen.CreateQrCode("HTTPS://NOOROPTICS.VERCEL.APP/Q/$sku", [QRCoder.QRCodeGenerator+ECCLevel]::M)
                $qr = New-Object QRCoder.QRCode($data)
                $qrBmp = $qr.GetGraphic(3, [System.Drawing.Color]::Black, [System.Drawing.Color]::White, $false)
                $qr.Dispose(); $data.Dispose(); $gen.Dispose()
            } catch {}
        }

        # Fallback to online API if QRCoder is unavailable
        if (-not $qrBmp) {
            try {
                $qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=87x87&margin=0&data=$([System.Uri]::EscapeDataString("HTTPS://NOOROPTICS.VERCEL.APP/Q/$sku"))"
                $wc = New-Object System.Net.WebClient
                $imgData = $wc.DownloadData($qrApiUrl)
                $msImg = New-Object System.IO.MemoryStream($imgData, 0, $imgData.Length)
                $qrBmp = [System.Drawing.Bitmap]::FromStream($msImg)
                $msImg.Close(); $wc.Dispose()
            } catch {}
        }

        if (-not $qrBmp) { return @() }

        # 2. Draw unified 384-dot wide label (100% aligned with POS-80 thermal printhead)
        $width = 384
        $height = 240
        $bmp = New-Object System.Drawing.Bitmap($width, $height)
        $g = [System.Drawing.Graphics]::FromImage($bmp)
        $g.Clear([System.Drawing.Color]::White)
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::SingleBitPerPixelGridFit

        # Center QR code
        $qrX = [Math]::Floor(($width - $qrBmp.Width) / 2)
        $qrY = 2
        $g.DrawImage($qrBmp, $qrX, $qrY, $qrBmp.Width, $qrBmp.Height)

        # Draw tiny, crisp optical tag typography (strictly centered under QR)
        $fontSku = New-Object System.Drawing.Font("Arial", 7.5, [System.Drawing.FontStyle]::Bold)
        $fontName = New-Object System.Drawing.Font("Arial", 6.5, [System.Drawing.FontStyle]::Regular)
        $fontPrice = New-Object System.Drawing.Font("Arial", 7.0, [System.Drawing.FontStyle]::Bold)
        $brush = [System.Drawing.Brushes]::Black

        $curY = $qrY + $qrBmp.Height + 2

        # SKU
        $sizeSku = $g.MeasureString($sku, $fontSku)
        $xSku = [Math]::Max(0, [Math]::Floor(($width - $sizeSku.Width) / 2))
        $g.DrawString($sku, $fontSku, $brush, $xSku, $curY)
        $curY += [Math]::Floor($sizeSku.Height) - 1

        # Frame Name
        if ($name) {
            $sizeName = $g.MeasureString($name, $fontName)
            $xName = [Math]::Max(0, [Math]::Floor(($width - $sizeName.Width) / 2))
            $g.DrawString($name, $fontName, $brush, $xName, $curY)
            $curY += [Math]::Floor($sizeName.Height) - 1
        }

        # Retail Price
        if ($price) {
            $sizePrice = $g.MeasureString($price, $fontPrice)
            $xPrice = [Math]::Max(0, [Math]::Floor(($width - $sizePrice.Width) / 2))
            $g.DrawString($price, $fontPrice, $brush, $xPrice, $curY)
            $curY += [Math]::Floor($sizePrice.Height) + 2
        }

        $g.Dispose()
        $qrBmp.Dispose()

        # Crop to actual content height
        $finalHeight = [Math]::Min($height, [Math]::Max(100, $curY))
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
        $sku = $sku.ToUpper()

        $name = ""
        if ($item.name) { $name = [string]$item.name }
        if ($name.Length -gt 22) { $name = $name.Substring(0, 22) }

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

            # 1. Check if client sent pre-computed 384-dot unified raster
            $rasterBytes = $null
            if ($item.stickerRasterBase64) {
                try {
                    $r = [Convert]::FromBase64String([string]$item.stickerRasterBase64)
                    if ($r -and $r.Length -gt 100) { $rasterBytes = $r }
                } catch {}
            }

            # 2. Generate unified 384-dot sticker bitmap in PowerShell (.NET System.Drawing)
            if (-not $rasterBytes -or $rasterBytes.Length -eq 0) {
                $rasterBytes = Generate-UnifiedStickerRaster $sku $name $price
            }

            # Write unified 2D QR Bit Image (GS v 0) - NEVER prints big plain text!
            if ($rasterBytes -and $rasterBytes.Length -gt 0) {
                $allBw.Write([byte[]]$rasterBytes)
            }

            # Minimal line feed and partial cut
            $allBw.Write([byte[]]@(0x1B, 0x64, 0x02)) # Feed 2 lines
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
            $name = if ($it.product_name) { $it.product_name } elseif ($it.name) { $it.name } elseif ($it.model) { $it.model } else { "Optical Frame" }
            $qty = if ($it.quantity) { [int]$it.quantity } else { 1 }
            $price = if ($it.unit_price_inr) { [double]$it.unit_price_inr } elseif ($it.unitPrice) { [double]$it.unitPrice } elseif ($it.unit_price) { [double]$it.unit_price } else { 0 }
            $tot = if ($it.subtotal_inr) { [double]$it.subtotal_inr } elseif ($it.subtotal) { [double]$it.subtotal } else { $price * $qty }

            $cleanName = if ($name.Length -gt 18) { $name.Substring(0, 18) } else { $name }
            $line = Row-Text $cleanName "$qty  Rs.$([Math]::Round($tot))"
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes($line))
            if ($it.variant_name) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Color: $($it.variant_name)`n"))
            } elseif ($it.color) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Color: $($it.color)`n"))
            }
            if ($it.lens_name) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Lens:  $($it.lens_name)`n"))
            } elseif ($it.lens) {
                $bw.Write([System.Text.Encoding]::ASCII.GetBytes(" Lens:  $($it.lens)`n"))
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
    $grandT = if ($order.total_payable_inr) { [double]$order.total_payable_inr } elseif ($order.grand_total) { [double]$order.grand_total } elseif ($order.total) { [double]$order.total } else { $sub }
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
    $balText = "Rs.0 (PAID)"
    if ($bal -gt 0) { $balText = "Rs.$([Math]::Round($bal))" }
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes((Row-Text "Balance Due:" $balText)))
    $bw.Write([System.Text.Encoding]::ASCII.GetBytes($divider))

    # 7. Prescription if attached
    $rx = $order.prescription
    if (-not $rx -and $order.items) {
        $rawIts = $order.items
        if ($rawIts -is [string]) {
            try { $rawIts = $rawIts | ConvertFrom-Json } catch {}
        }
        if ($rawIts -and $rawIts.Count -gt 0) {
            $firstIt = $rawIts[0]
            if ($firstIt.prescription) { $rx = $firstIt.prescription }
            elseif ($firstIt.rx) { $rx = $firstIt.rx }
        }
    }
    if (-not $rx) { $rx = $order.newPrescription }
    if (-not $rx) { $rx = $order }

    $odSphV = if ($rx.od_sph -ne $null -and "$($rx.od_sph)" -ne "") { $rx.od_sph } `
              elseif ($rx.odSph -ne $null -and "$($rx.odSph)" -ne "") { $rx.odSph } `
              elseif ($order.od_sph -ne $null -and "$($order.od_sph)" -ne "") { $order.od_sph } `
              elseif ($order.odSph -ne $null -and "$($order.odSph)" -ne "") { $order.odSph } `
              else { $null }

    $osSphV = if ($rx.os_sph -ne $null -and "$($rx.os_sph)" -ne "") { $rx.os_sph } `
              elseif ($rx.osSph -ne $null -and "$($rx.osSph)" -ne "") { $rx.osSph } `
              elseif ($order.os_sph -ne $null -and "$($order.os_sph)" -ne "") { $order.os_sph } `
              elseif ($order.osSph -ne $null -and "$($order.osSph)" -ne "") { $order.osSph } `
              else { $null }

    $odCylV = if ($rx.od_cyl -ne $null -and "$($rx.od_cyl)" -ne "") { $rx.od_cyl } `
              elseif ($rx.odCyl -ne $null -and "$($rx.odCyl)" -ne "") { $rx.odCyl } `
              elseif ($order.od_cyl -ne $null -and "$($order.od_cyl)" -ne "") { $order.od_cyl } `
              elseif ($order.odCyl -ne $null -and "$($order.odCyl)" -ne "") { $order.odCyl } `
              else { $null }

    $osCylV = if ($rx.os_cyl -ne $null -and "$($rx.os_cyl)" -ne "") { $rx.os_cyl } `
              elseif ($rx.osCyl -ne $null -and "$($rx.osCyl)" -ne "") { $rx.osCyl } `
              elseif ($order.os_cyl -ne $null -and "$($order.os_cyl)" -ne "") { $order.os_cyl } `
              elseif ($order.osCyl -ne $null -and "$($order.osCyl)" -ne "") { $order.osCyl } `
              else { $null }

    $hasRx = ($odSphV -ne $null) -or ($osSphV -ne $null) -or ($odCylV -ne $null) -or ($osCylV -ne $null) -or ($rx.prescription_number) -or ($order.prescription_number)

    if ($hasRx) {
        $bw.Write([byte[]]@(0x1B, 0x61, 0x01))
        $bw.Write([byte[]]@(0x1B, 0x45, 0x01))
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("--- CLIENT PRESCRIPTION (RX) ---`n"))
        $bw.Write([byte[]]@(0x1B, 0x45, 0x00))
        $bw.Write([byte[]]@(0x1B, 0x61, 0x00))

        function Format-Diopter($val) {
            if ($val -eq $null -or [string]$val -eq "" -or [string]$val -eq "-") { return "  --- " }
            $str = [string]$val
            $num = 0.0
            if ([double]::TryParse($str, [ref]$num)) {
                return "{0:+0.00;-0.00; 0.00}" -f $num
            }
            return "{0,6}" -f $str
        }

        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Eye    SPH    CYL   AXIS   ADD  `n"))
        $odS = Format-Diopter $odSphV
        $odC = Format-Diopter $odCylV
        $odAxV = if ($rx.od_axis) { $rx.od_axis } elseif ($rx.odAxis) { $rx.odAxis } elseif ($order.od_axis) { $order.od_axis } elseif ($order.odAxis) { $order.odAxis } else { "---" }
        $odA = "{0,3}" -f $odAxV
        $addRaw = if ($rx.addition) { $rx.addition } elseif ($order.addition) { $order.addition } else { $null }
        $add = if ($addRaw) { Format-Diopter $addRaw } else { " --- " }
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OD   $odS  $odC   $odA  $add`n"))

        $osS = Format-Diopter $osSphV
        $osC = Format-Diopter $osCylV
        $osAxV = if ($rx.os_axis) { $rx.os_axis } elseif ($rx.osAxis) { $rx.osAxis } elseif ($order.os_axis) { $order.os_axis } elseif ($order.osAxis) { $order.osAxis } else { "---" }
        $osA = "{0,3}" -f $osAxV
        $bw.Write([System.Text.Encoding]::ASCII.GetBytes("OS   $osS  $osC   $osA  $add`n"))

        $pdVal = if ($rx.ipd_distance) { $rx.ipd_distance } elseif ($rx.ipdDistance) { $rx.ipdDistance } elseif ($rx.pd) { $rx.pd } elseif ($order.ipd_distance) { $order.ipd_distance } elseif ($order.pd) { $order.pd } else { $null }
        if ($pdVal) {
            $bw.Write([System.Text.Encoding]::ASCII.GetBytes("Distance PD: $pdVal mm`n"))
        }

        $docVal = if ($rx.checked_by) { $rx.checked_by } elseif ($rx.checkedBy) { $rx.checkedBy } elseif ($rx.rx_checked_by) { $rx.rx_checked_by } elseif ($order.checked_by) { $order.checked_by } elseif ($order.rx_checked_by) { $order.rx_checked_by } else { $null }
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


# ── Cloud Order Poller (Direct Background Supabase Sync) ─────────────────────
function Poll-CloudOrders {
    if (-not $Config.supabaseUrl -or -not $Config.supabaseAnonKey) { return }

    try {
        $headers = @{
            "apikey" = $Config.supabaseAnonKey
            "Authorization" = "Bearer $($Config.supabaseAnonKey)"
        }
        $url = "$($Config.supabaseUrl)/rest/v1/orders?select=*&order=created_at.desc&limit=10"
        $orders = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue

        if ($orders -and $orders.Count -gt 0) {
            $nowUtc = [DateTime]::UtcNow
            $freshnessMinutes = [int]$Config.orderFreshnessMinutes
            $changed = $false

            foreach ($o in $orders) {
                $ref = if ($o.order_ref) { [string]$o.order_ref } elseif ($o.order_number) { [string]$o.order_number } else { [string]$o.id }
                if (-not $ref -or $ref -match "TEST") { continue }
                if ($History.ContainsKey($ref)) { continue }

                # Stale historical check: don't print old orders on reboot
                if ($o.created_at) {
                    try {
                        $orderTime = [DateTime]::Parse($o.created_at).ToUniversalTime()
                        $ageMinutes = ($nowUtc - $orderTime).TotalMinutes
                        if ($ageMinutes -gt $freshnessMinutes) {
                            $History[$ref] = "SKIPPED_STALE"
                            $changed = $true
                            continue
                        }
                    } catch {}
                }

                Write-DaemonLog "[Cloud Sync] Detected newly confirmed website order #$ref! Auto-printing..."
                if (-not $o.channel) { $o | Add-Member -NotePropertyName "channel" -NotePropertyValue "WEBSITE" -Force }

                # Extract Rx from items or query Supabase prescriptions table by phone
                if (-not $o.prescription -and $o.customer_phone) {
                    try {
                        $cPhoneClean = [string]$o.customer_phone
                        $rxUrl = "$($Config.supabaseUrl)/rest/v1/prescriptions?client_phone=eq.$([System.Uri]::EscapeDataString($cPhoneClean.Trim()))&order=created_at.desc&limit=1"
                        $rxData = Invoke-RestMethod -Uri $rxUrl -Headers $headers -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
                        if ($rxData -and $rxData.Count -gt 0) {
                            $o | Add-Member -NotePropertyName "prescription" -NotePropertyValue $rxData[0] -Force
                        }
                    } catch {}
                }

                $bytes = Format-ReceiptBytes $o
                $ok = Spool-Bytes $bytes "Website-Bill-$ref"

                if ($ok) {
                    $History[$ref] = (Get-Date).ToString("o")
                    $changed = $true
                    Write-DaemonLog "[Cloud Sync] SUCCESS: Printed website order #$ref to $($Config.printerName)!" "INFO"
                } else {
                    Write-DaemonLog "[Cloud Sync] FAILED: Could not spool website order #$ref" "ERROR"
                }
            }

            if ($changed) { Save-History }
        }
    } catch {
        Write-DaemonLog "[Cloud Sync] Error: $_" "ERROR"
    }
}

# ── Cloud Print Queue (Direct Background Sticker & Manual Print Jobs) ────────
function Poll-CloudPrintQueue {
    if (-not $Config.supabaseUrl -or -not $Config.supabaseAnonKey) { return }

    try {
        $headers = @{
            "apikey" = $Config.supabaseAnonKey
            "Authorization" = "Bearer $($Config.supabaseAnonKey)"
        }
        $url = "$($Config.supabaseUrl)/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE"
        $recs = Invoke-RestMethod -Uri $url -Headers $headers -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue

        if ($recs -and $recs.Count -gt 0 -and $recs[0].notes) {
            $notesObj = $null
            try { $notesObj = $recs[0].notes | ConvertFrom-Json } catch {}

            if ($notesObj -and $notesObj.jobs -and $notesObj.jobs.Count -gt 0) {
                $jobs = @($notesObj.jobs)
                $remainingJobs = New-Object System.Collections.ArrayList
                $changed = $false

                foreach ($job in $jobs) {
                    $jobId = [string]$job.id
                    if ($History.ContainsKey($jobId)) {
                        continue
                    }

                    Write-DaemonLog "[Cloud Print Queue] Processing job #$jobId (Type: $($job.type))..."

                    $ok = $false
                    if ($job.type -eq "qr_sticker" -and $job.items) {
                        $rawItems = @($job.items)
                        $bytes = Format-StickerBytes $rawItems
                        $ok = Spool-Bytes $bytes "Sticker-$jobId"
                    } elseif ($job.type -eq "receipt" -and $job.order) {
                        $bytes = Format-ReceiptBytes $job.order
                        $ok = Spool-Bytes $bytes "Receipt-$jobId"
                    }

                    if ($ok) {
                        $History[$jobId] = (Get-Date).ToString("o")
                        $changed = $true
                        Write-DaemonLog "[Cloud Print Queue] SUCCESS: Spooled job #$jobId to $($Config.printerName)!" "INFO"
                    } else {
                        Write-DaemonLog "[Cloud Print Queue] FAILED: Spool error on job #$jobId" "ERROR"
                        $remainingJobs.Add($job) | Out-Null
                    }
                }

                # Clear processed jobs in Supabase
                $patchUrl = "$($Config.supabaseUrl)/rest/v1/customers?client_code=eq.SYS-PRINT-QUEUE"
                $patchHeaders = @{
                    "apikey" = $Config.supabaseAnonKey
                    "Authorization" = "Bearer $($Config.supabaseAnonKey)"
                    "Content-Type" = "application/json"
                    "Prefer" = "return=minimal"
                }
                $patchBody = @{
                    id = "sys-print-queue-global"
                    client_code = "SYS-PRINT-QUEUE"
                    name = "System Print Queue"
                    city = "Bengaluru"
                    notes = (@{ jobs = $remainingJobs.ToArray() } | ConvertTo-Json -Compress)
                } | ConvertTo-Json

                Invoke-RestMethod -Uri $patchUrl -Headers $patchHeaders -Method Patch -Body $patchBody -TimeoutSec 5 -ErrorAction SilentlyContinue | Out-Null
                if ($changed) { Save-History }
            }
        }
    } catch {
        Write-DaemonLog "[Cloud Print Queue] Error: $_" "ERROR"
    }
}

Write-DaemonLog "[Cloud Sync] Autonomous background polling ACTIVE (Checking Supabase every 4s)"
Write-DaemonLog "[Cloud Sync] You DO NOT need to keep the admin page open for orders to print!"

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

        # 2. Autonomous Cloud Order Polling (Every 4 seconds)
        # Directly fetches newly placed website orders from Supabase without needing any browser!
        $nowEpoch = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
        if ($nowEpoch - $lastCloudPoll -ge 3) {
            $lastCloudPoll = $nowEpoch
            Poll-CloudOrders
            Poll-CloudPrintQueue
        }

        Start-Sleep -Milliseconds 150
    } catch {
        Write-DaemonLog "Daemon loop error: $_" "ERROR"
        Start-Sleep -Milliseconds 500
    }
}
