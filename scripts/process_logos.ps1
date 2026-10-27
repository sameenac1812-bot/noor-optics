Add-Type -AssemblyName System.Drawing

$srcPath = "c:\Users\atibo\OneDrive\Documents\noor opticals\images\noor_optic_minimal_logo.png"
$blackOut = "c:\Users\atibo\OneDrive\Documents\noor opticals\images\noor_logo_black.png"
$whiteOut = "c:\Users\atibo\OneDrive\Documents\noor opticals\images\noor_logo_white.png"
$emblemBlackOut = "c:\Users\atibo\OneDrive\Documents\noor opticals\images\noor_emblem_black.png"
$emblemWhiteOut = "c:\Users\atibo\OneDrive\Documents\noor opticals\images\noor_emblem_white.png"

$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

# Find bounding box of all content
$minX = $w; $maxX = 0; $minY = $h; $maxY = 0;
# Also find division between emblem and text
$emblemMaxY = 0

# Find vertical profile to detect where glasses emblem ends and text begins
$rowDarkCount = @{}
for ($y = 0; $y -lt $h; $y++) {
    $rowDarkCount[$y] = 0
    for ($x = 0; $x -lt $w; $x += 4) {
        $c = $src.GetPixel($x, $y)
        $b = [int](0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B)
        if ($b -lt 200) {
            $rowDarkCount[$y]++
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

# The gap between emblem and text occurs between Y = 680 and Y = 820 where rowDarkCount is 0
$gapY = 0
for ($y = 650; $y -lt 850; $y++) {
    if ($rowDarkCount[$y] -eq 0 -and $rowDarkCount[$y - 1] -eq 0 -and $rowDarkCount[$y + 1] -eq 0) {
        $gapY = $y
        break
    }
}

Write-Host "Detected gap between emblem and text at Y = $gapY"
$emblemBottom = if ($gapY -gt 0) { $gapY } else { 720 }

$pad = 20
$minX = [Math]::Max(0, $minX - $pad)
$minY = [Math]::Max(0, $minY - $pad)
$maxX = [Math]::Min($w - 1, $maxX + $pad)
$maxY = [Math]::Min($h - 1, $maxY + $pad)
$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1

Write-Host "Logo bounding box: $minX, $minY, $cropW x $cropH"

function GenerateTransparentPNG($cropWidth, $cropHeight, $startX, $startY, $outputPath, $isWhite) {
    $bmp = New-Object System.Drawing.Bitmap($cropWidth, $cropHeight, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    for ($cy = 0; $cy -lt $cropHeight; $cy++) {
        for ($cx = 0; $cx -lt $cropWidth; $cx++) {
            $px = $src.GetPixel($startX + $cx, $startY + $cy)
            $lum = [int](0.299 * $px.R + 0.587 * $px.G + 0.114 * $px.B)
            # Threshold smoothly
            if ($lum -ge 245) {
                $alpha = 0
            } elseif ($lum -le 30) {
                $alpha = 255
            } else {
                $alpha = 255 - [int](($lum - 30) * (255.0 / 215.0))
            }

            if ($alpha -gt 0) {
                if ($isWhite) {
                    $bmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb($alpha, 255, 255, 255))
                } else {
                    $bmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb($alpha, 17, 17, 17))
                }
            } else {
                $bmp.SetPixel($cx, $cy, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Saved: $outputPath"
}

# 1. Full Logo (Black on transparent)
GenerateTransparentPNG $cropW $cropH $minX $minY $blackOut $false

# 2. Full Logo (White on transparent)
GenerateTransparentPNG $cropW $cropH $minX $minY $whiteOut $true

# 3. Emblem Only (Spectacles only)
$emblemCropH = $emblemBottom - $minY + 1
GenerateTransparentPNG $cropW $emblemCropH $minX $minY $emblemBlackOut $false
GenerateTransparentPNG $cropW $emblemCropH $minX $minY $emblemWhiteOut $true

# 4. Square Favicon
$embBmp = [System.Drawing.Bitmap]::FromFile($emblemBlackOut)
$favSize = [Math]::Max($embBmp.Width, $embBmp.Height) + 120
$fav = New-Object System.Drawing.Bitmap($favSize, $favSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($fav)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$fx = [int](($favSize - $embBmp.Width) / 2)
$fy = [int](($favSize - $embBmp.Height) / 2)
$g.DrawImage($embBmp, $fx, $fy, $embBmp.Width, $embBmp.Height)
$g.Dispose()
$fav.Save("c:\Users\atibo\OneDrive\Documents\noor opticals\images\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$fav.Save("c:\Users\atibo\OneDrive\Documents\noor opticals\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$fav.Dispose()
$embBmp.Dispose()
Write-Host "Saved square favicon: images/favicon.png and favicon.png"

$src.Dispose()
Write-Host "All logo variants successfully generated!"
