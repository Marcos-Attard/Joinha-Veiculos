$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$possibleLogoPaths = @(
  "src\assets\Logo-Joinha.png",
  "public\Logo-Joinha.png",
  "src\assets\logo-joinha.png",
  "public\logo-joinha.png"
)

$logoPath = $possibleLogoPaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $logoPath) {
  throw "Não encontrei o arquivo do logo."
}

function Resize-Image {
  param(
    [string]$src,
    [string]$dest,
    [int]$size
  )

  $img = [System.Drawing.Image]::FromFile($src)
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)

  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.DrawImage($img, 0, 0, $size, $size)

  $bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)

  $g.Dispose()
  $bmp.Dispose()
  $img.Dispose()
}

function Get-VisibleBounds {
  param($bmp)

  $minX = $bmp.Width
  $minY = $bmp.Height
  $maxX = 0
  $maxY = 0
  $found = $false

  for ($y = 0; $y -lt $bmp.Height; $y++) {
    for ($x = 0; $x -lt $bmp.Width; $x++) {
      $p = $bmp.GetPixel($x, $y)
      if ($p.A -gt 10) {
        if ($x -lt $minX) { $minX = $x }
        if ($y -lt $minY) { $minY = $y }
        if ($x -gt $maxX) { $maxX = $x }
        if ($y -gt $maxY) { $maxY = $y }
        $found = $true
      }
    }
  }

  if (-not $found) {
    return New-Object System.Drawing.Rectangle(0, 0, $bmp.Width, $bmp.Height)
  }

  return New-Object System.Drawing.Rectangle($minX, $minY, (($maxX - $minX) + 1), (($maxY - $minY) + 1))
}

function Draw-CenteredText {
  param(
    $g,
    [string]$text,
    [float]$fontSize,
    $brush,
    $rect
  )

  $font = New-Object System.Drawing.Font("Arial Black", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = [System.Drawing.StringAlignment]::Center
  $format.LineAlignment = [System.Drawing.StringAlignment]::Center

  $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 0, 0, 0))
  $shadowRect = New-Object System.Drawing.RectangleF(($rect.X + 3), ($rect.Y + 3), $rect.Width, $rect.Height)

  $g.DrawString($text, $font, $shadowBrush, $shadowRect, $format)
  $g.DrawString($text, $font, $brush, $rect, $format)

  $shadowBrush.Dispose()
  $font.Dispose()
  $format.Dispose()
}

function New-JoinhaIconV13 {
  param(
    [string]$label,
    [string]$outputBase,
    [System.Drawing.Color]$accentColor
  )

  $size = 1024
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)

  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  # Fundo escuro
  $bgRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
  $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $bgRect,
    [System.Drawing.Color]::FromArgb(8, 14, 28),
    [System.Drawing.Color]::FromArgb(2, 4, 10),
    90
  )
  $g.FillRectangle($bgBrush, $bgRect)

  # Círculo externo interno ao canvas
  $glowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(70, $accentColor.R, $accentColor.G, $accentColor.B), 24)
  $g.DrawEllipse($glowPen, 122, 122, 780, 780)

  $ringPen = New-Object System.Drawing.Pen($accentColor, 8)
  $g.DrawEllipse($ringPen, 146, 146, 732, 732)

  $ringWhitePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(210, 238, 238, 238), 3)
  $g.DrawEllipse($ringWhitePen, 168, 168, 688, 688)

  # Logo Joinha maior
  $logo = [System.Drawing.Bitmap]::FromFile($logoPath)
  $srcRect = Get-VisibleBounds $logo

  $maxLogoW = 620
  $maxLogoH = 620
  $ratioW = $maxLogoW / $srcRect.Width
  $ratioH = $maxLogoH / $srcRect.Height
  $ratio = [Math]::Min($ratioW, $ratioH)

  $logoW = [int]($srcRect.Width * $ratio)
  $logoH = [int]($srcRect.Height * $ratio)

  $logoX = [int](($size - $logoW) / 2)
  $logoY = 175

  $destRect = New-Object System.Drawing.Rectangle($logoX, $logoY, $logoW, $logoH)
  $g.DrawImage($logo, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

  # Texto dentro do vermelho
  if ($label.Length -ge 5) {
    $fontSize = 46
  } else {
    $fontSize = 58
  }

  $textRect = New-Object System.Drawing.RectangleF(
    ($logoX + ($logoW * 0.25)),
    ($logoY + ($logoH * 0.58)),
    ($logoW * 0.50),
    ($logoH * 0.12)
  )

  $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 245, 215, 90))
  Draw-CenteredText $g $label $fontSize $textBrush $textRect

  $out1024 = "public\$outputBase-1024.png"
  $out512 = "public\$outputBase-512.png"
  $out192 = "public\$outputBase-192.png"

  $bmp.Save($out1024, [System.Drawing.Imaging.ImageFormat]::Png)

  $textBrush.Dispose()
  $logo.Dispose()
  $ringWhitePen.Dispose()
  $ringPen.Dispose()
  $glowPen.Dispose()
  $bgBrush.Dispose()
  $g.Dispose()
  $bmp.Dispose()

  Resize-Image $out1024 $out512 512
  Resize-Image $out1024 $out192 192
}

New-JoinhaIconV13 `
  "LOJA" `
  "joinha-loja-icon-v13" `
  ([System.Drawing.Color]::FromArgb(40, 185, 255))

New-JoinhaIconV13 `
  "STAFF" `
  "joinha-staff-icon-v13" `
  ([System.Drawing.Color]::FromArgb(255, 35, 55))

Write-Host "Icones v13 criados com sucesso."