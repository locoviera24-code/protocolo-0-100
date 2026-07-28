param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repoRoot = Split-Path -Parent $PSScriptRoot
$iconRoot = Join-Path $repoRoot 'icons'
New-Item -ItemType Directory -Force -Path $iconRoot | Out-Null

function New-Canvas([int]$size) {
    $bitmap = [System.Drawing.Bitmap]::new($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#0b1220'))
    return @($bitmap, $graphics)
}

function Save-Canvas($canvas, [string]$name) {
    $path = Join-Path $iconRoot $name
    $canvas[0].Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas[1].Dispose()
    $canvas[0].Dispose()
    Write-Host "Generado: icons/$name"
}

function New-Maskable([int]$size) {
    $canvas = New-Canvas $size
    $g = $canvas[1]
    $cyan = [System.Drawing.ColorTranslator]::FromHtml('#68d2f3')
    $green = [System.Drawing.ColorTranslator]::FromHtml('#8ce7b6')
    $line = [Math]::Max(6, [Math]::Round($size * 0.035))
    $frame = [System.Drawing.Pen]::new($cyan, $line)
    $frame.StartCap = $frame.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $x = [Math]::Round($size * 0.22); $y = [Math]::Round($size * 0.22); $w = [Math]::Round($size * 0.56); $h = [Math]::Round($size * 0.56)
    $g.DrawArc($frame, $x, $y, $w, $h, 0, 360)
    $barWidth = [Math]::Round($size * 0.075); $gap = [Math]::Round($size * 0.045); $base = [Math]::Round($size * 0.68)
    $heights = @(0.12, 0.22, 0.32, 0.43)
    for ($i = 0; $i -lt $heights.Count; $i++) {
        $brush = [System.Drawing.SolidBrush]::new($(if ($i -lt 2) { $cyan } else { $green }))
        $height = [Math]::Round($size * $heights[$i]); $left = [Math]::Round($size * 0.31) + $i * ($barWidth + $gap)
        $g.FillRectangle($brush, $left, $base - $height, $barWidth, $height)
        $brush.Dispose()
    }
    $frame.Dispose()
    Save-Canvas $canvas "icon-maskable-$size.png"
}

function New-Shortcut([string]$kind) {
    $size = 96; $canvas = New-Canvas $size; $g = $canvas[1]
    $cyan = [System.Drawing.ColorTranslator]::FromHtml('#68d2f3'); $green = [System.Drawing.ColorTranslator]::FromHtml('#8ce7b6')
    $pen = [System.Drawing.Pen]::new($cyan, 7); $pen.StartCap = $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $accent = [System.Drawing.Pen]::new($green, 7); $accent.StartCap = $accent.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    switch ($kind) {
        'home' {
            $g.DrawLines($pen, @([System.Drawing.Point]::new(20,46),[System.Drawing.Point]::new(48,22),[System.Drawing.Point]::new(76,46)))
            $g.DrawLines($accent, @([System.Drawing.Point]::new(29,43),[System.Drawing.Point]::new(29,73),[System.Drawing.Point]::new(67,73),[System.Drawing.Point]::new(67,43)))
        }
        'gym' {
            $g.DrawLine($pen,25,48,71,48); $g.DrawLine($accent,27,34,27,62); $g.DrawLine($accent,69,34,69,62); $g.DrawLine($pen,17,39,17,57); $g.DrawLine($pen,79,39,79,57)
        }
        'set' {
            $g.DrawLine($pen,23,64,73,64); $g.DrawLine($accent,31,64,31,50); $g.DrawLine($accent,48,64,48,38); $g.DrawLine($accent,65,64,65,27); $g.DrawLine($pen,48,18,48,28); $g.DrawLine($pen,43,23,53,23)
        }
        'nutrition' {
            $g.DrawArc($pen,20,31,56,38,0,180); $g.DrawLine($pen,25,52,71,52); $g.DrawLine($accent,36,69,60,69); $g.DrawLine($accent,48,23,48,42)
        }
        'party' {
            $g.DrawEllipse($pen,20,24,22,22); $g.DrawEllipse($accent,54,24,22,22); $g.DrawArc($pen,14,48,36,28,190,160); $g.DrawArc($accent,46,48,36,28,190,160)
        }
    }
    $pen.Dispose(); $accent.Dispose(); Save-Canvas $canvas "shortcut-$kind-96.png"
}

New-Maskable 192
New-Maskable 512
@('home','gym','set','nutrition','party') | ForEach-Object { New-Shortcut $_ }
