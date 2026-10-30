# pos-daemon/generate-rasters.ps1 - Generates 2.5-Inch (384-dot) ESC/POS Raster Binaries
Add-Type -AssemblyName System.Drawing

function Convert-ToEscPosRaster {
    param(
        [string]$ImagePath,
        [int]$TargetWidth = 384,
        [int]$ContentSize = 180,
        [int]$Threshold = 180
    )
    $resolvedPath = (Resolve-Path $ImagePath).Path
    $src = [System.Drawing.Bitmap]::FromFile($resolvedPath)
    $aspect = $src.Height / $src.Width
    $contentH = [int]($ContentSize * $aspect)
    
    # Create canvas: exactly 384 dots wide (48 bytes per line)
    $canvas = New-Object System.Drawing.Bitmap($TargetWidth, $contentH)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.Clear([System.Drawing.Color]::White)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $offsetX = [int](($TargetWidth - $ContentSize) / 2)
    $g.DrawImage($src, $offsetX, 0, $ContentSize, $contentH)
    $g.Dispose()
    $src.Dispose()
    
    $widthBytes = [int]($TargetWidth / 8)
    $heightDots = $contentH
    
    $ms = New-Object System.IO.MemoryStream
    $bw = New-Object System.IO.BinaryWriter($ms)
    
    # GS v 0 0 xL xH yL yH
    $xL = [byte]($widthBytes % 256)
    $xH = [byte][Math]::Floor($widthBytes / 256)
    $yL = [byte]($heightDots % 256)
    $yH = [byte][Math]::Floor($heightDots / 256)
    
    $bw.Write([byte[]]@(0x1D, 0x76, 0x30, 0x00, $xL, $xH, $yL, $yH))
    
    for ($y = 0; $y -lt $heightDots; $y++) {
        for ($xb = 0; $xb -lt $widthBytes; $xb++) {
            $byteVal = 0
            for ($bit = 0; $bit -lt 8; $bit++) {
                $px = ($xb * 8) + $bit
                $color = $canvas.GetPixel($px, $y)
                # Black dot is bit 1
                $luminance = (0.299 * $color.R) + (0.587 * $color.G) + (0.114 * $color.B)
                if ($color.A -gt 50 -and $luminance -lt $Threshold) {
                    $byteVal = $byteVal -bor (1 -shl (7 - $bit))
                }
            }
            $bw.Write([byte]$byteVal)
        }
    }
    
    $canvas.Dispose()
    $bytes = $ms.ToArray()
    $bw.Close()
    $ms.Close()
    return $bytes
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$logoPath = Join-Path $ScriptDir "assets\bill_logo.png"
$logoBytes = Convert-ToEscPosRaster -ImagePath $logoPath -TargetWidth 384 -ContentSize 160 -Threshold 180
$logoOut = Join-Path $ScriptDir "assets\logo_raster.bin"
[System.IO.File]::WriteAllBytes($logoOut, $logoBytes)
Write-Host "Generated Logo Raster ($($logoBytes.Length) bytes) -> $logoOut"

$qrPath = Join-Path $ScriptDir "assets\payment_qr.jpg"
$qrBytes = Convert-ToEscPosRaster -ImagePath $qrPath -TargetWidth 384 -ContentSize 216 -Threshold 180
$qrOut = Join-Path $ScriptDir "assets\payment_qr_raster.bin"
[System.IO.File]::WriteAllBytes($qrOut, $qrBytes)
Write-Host "Generated Payment QR Raster ($($qrBytes.Length) bytes) -> $qrOut"

# Also generate a Base64 file for pure zero-file inline embedding in JavaScript / JSON
$logoB64 = [Convert]::ToBase64String($logoBytes)
$qrB64 = [Convert]::ToBase64String($qrBytes)
$b64Out = Join-Path $ScriptDir "assets\rasters_base64.json"
@{
    logo = $logoB64
    paymentQr = $qrB64
} | ConvertTo-Json | Set-Content $b64Out -Encoding UTF8
Write-Host "Exported Rasters to $b64Out"

