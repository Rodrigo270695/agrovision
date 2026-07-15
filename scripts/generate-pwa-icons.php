<?php

declare(strict_types=1);

$sourcePath = __DIR__.'/../public/icon.png';
$outDir = __DIR__.'/../public/icons';
$publicDir = __DIR__.'/../public';

if (! is_dir($outDir)) {
    mkdir($outDir, 0755, true);
}

$source = @imagecreatefrompng($sourcePath);

if ($source === false) {
    fwrite(STDERR, "No se pudo leer public/icon.png\n");
    exit(1);
}

imagesavealpha($source, true);
$srcW = imagesx($source);
$srcH = imagesy($source);

$sizes = [48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];

/**
 * Convierte el fondo negro del logo a transparente.
 */
function withoutBlackBackground(GdImage $source, int $srcW, int $srcH): GdImage
{
    $out = imagecreatetruecolor($srcW, $srcH);
    imagealphablending($out, false);
    imagesavealpha($out, true);

    $transparent = imagecolorallocatealpha($out, 0, 0, 0, 127);
    imagefilledrectangle($out, 0, 0, $srcW, $srcH, $transparent);

    for ($y = 0; $y < $srcH; $y++) {
        for ($x = 0; $x < $srcW; $x++) {
            $rgba = imagecolorat($source, $x, $y);
            $r = ($rgba >> 16) & 0xFF;
            $g = ($rgba >> 8) & 0xFF;
            $b = $rgba & 0xFF;
            $a = ($rgba & 0x7F000000) >> 24;

            // Negros / casi negros → transparente
            if ($r < 28 && $g < 28 && $b < 28) {
                imagesetpixel($out, $x, $y, $transparent);

                continue;
            }

            $color = imagecolorallocatealpha($out, $r, $g, $b, $a);
            imagesetpixel($out, $x, $y, $color);
        }
    }

    return $out;
}

/**
 * Aplica máscara circular: fuera del círculo queda transparente.
 */
function applyCircleMask(GdImage $canvas, int $size): void
{
    $cx = ($size - 1) / 2;
    $cy = ($size - 1) / 2;
    $radius = $size / 2;
    $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);

    imagealphablending($canvas, false);

    for ($y = 0; $y < $size; $y++) {
        for ($x = 0; $x < $size; $x++) {
            $dx = $x - $cx;
            $dy = $y - $cy;
            if (($dx * $dx) + ($dy * $dy) > ($radius * $radius)) {
                imagesetpixel($canvas, $x, $y, $transparent);
            }
        }
    }

    imagealphablending($canvas, true);
    imagesavealpha($canvas, true);
}

/**
 * Icono circular: disco blanco + logo (sin fondo negro).
 * maskable: lienzo blanco cuadrado con zona segura (Android recorta).
 */
function makeIcon(GdImage $logo, int $srcW, int $srcH, int $size, bool $maskable = false): GdImage
{
    $canvas = imagecreatetruecolor($size, $size);
    imagealphablending($canvas, false);
    imagesavealpha($canvas, true);

    $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
    imagefilledrectangle($canvas, 0, 0, $size, $size, $transparent);

    imagealphablending($canvas, true);
    $white = imagecolorallocate($canvas, 255, 255, 255);

    if ($maskable) {
        imagefilledrectangle($canvas, 0, 0, $size, $size, $white);
        $paddingRatio = 0.18;
    } else {
        imagefilledellipse($canvas, (int) ($size / 2), (int) ($size / 2), $size, $size, $white);
        $paddingRatio = 0.10;
    }

    $inner = (int) round($size * (1 - ($paddingRatio * 2)));
    $offset = (int) round(($size - $inner) / 2);

    imagecopyresampled(
        $canvas,
        $logo,
        $offset,
        $offset,
        0,
        0,
        $inner,
        $inner,
        $srcW,
        $srcH,
    );

    if (! $maskable) {
        applyCircleMask($canvas, $size);
    }

    return $canvas;
}

function savePng(GdImage $image, string $path): void
{
    imagepng($image, $path, 6);
    imagedestroy($image);
    echo "Created {$path}\n";
}

$logo = withoutBlackBackground($source, $srcW, $srcH);
imagedestroy($source);

foreach ($sizes as $size) {
    savePng(
        makeIcon($logo, $srcW, $srcH, $size, false),
        "{$outDir}/icon-{$size}x{$size}.png",
    );
}

foreach ([192, 512] as $size) {
    savePng(
        makeIcon($logo, $srcW, $srcH, $size, true),
        "{$outDir}/maskable-{$size}x{$size}.png",
    );
}

savePng(makeIcon($logo, $srcW, $srcH, 180, false), "{$publicDir}/apple-touch-icon.png");
savePng(makeIcon($logo, $srcW, $srcH, 32, false), "{$publicDir}/favicon-32x32.png");
savePng(makeIcon($logo, $srcW, $srcH, 16, false), "{$publicDir}/favicon-16x16.png");
savePng(makeIcon($logo, $srcW, $srcH, 512, false), "{$publicDir}/icon-round.png");

// favicon.ico = PNG 32 circular (Chrome lo acepta)
copy("{$publicDir}/favicon-32x32.png", "{$publicDir}/favicon.ico");
echo "Created {$publicDir}/favicon.ico\n";

foreach (["{$publicDir}/favicon.svg", "{$outDir}/icon.svg"] as $legacySvg) {
    if (is_file($legacySvg)) {
        unlink($legacySvg);
        echo "Removed {$legacySvg}\n";
    }
}

imagedestroy($logo);
echo "Done.\n";
