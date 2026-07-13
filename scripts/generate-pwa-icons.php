<?php

declare(strict_types=1);

$sourcePath = __DIR__.'/../public/apple-touch-icon.png';
$svgPath = __DIR__.'/../public/favicon.svg';
$outDir = __DIR__.'/../public/icons';

if (! is_dir($outDir)) {
    mkdir($outDir, 0755, true);
}

$source = @imagecreatefrompng($sourcePath);

if ($source === false) {
    fwrite(STDERR, "No se pudo leer apple-touch-icon.png\n");
    exit(1);
}

imagesavealpha($source, true);
$srcW = imagesx($source);
$srcH = imagesy($source);

$sizes = [48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512];

function makeIcon(GdImage $source, int $srcW, int $srcH, int $size, bool $maskable = false): GdImage
{
    $canvas = imagecreatetruecolor($size, $size);
    imagealphablending($canvas, false);
    imagesavealpha($canvas, true);

    $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
    imagefilledrectangle($canvas, 0, 0, $size, $size, $transparent);
    imagealphablending($canvas, true);

    // Fondo blanco para que el logo rojo de Laravel se vea bien
    $background = imagecolorallocate($canvas, 255, 255, 255);
    imagefilledrectangle($canvas, 0, 0, $size, $size, $background);

    $paddingRatio = $maskable ? 0.22 : 0.14;
    $inner = (int) round($size * (1 - ($paddingRatio * 2)));
    $offset = (int) round(($size - $inner) / 2);

    imagecopyresampled(
        $canvas,
        $source,
        $offset,
        $offset,
        0,
        0,
        $inner,
        $inner,
        $srcW,
        $srcH,
    );

    return $canvas;
}

foreach ($sizes as $size) {
    $icon = makeIcon($source, $srcW, $srcH, $size, false);
    $path = "{$outDir}/icon-{$size}x{$size}.png";
    imagepng($icon, $path, 6);
    imagedestroy($icon);
    echo "Created {$path}\n";
}

foreach ([192, 512] as $size) {
    $icon = makeIcon($source, $srcW, $srcH, $size, true);
    $path = "{$outDir}/maskable-{$size}x{$size}.png";
    imagepng($icon, $path, 6);
    imagedestroy($icon);
    echo "Created {$path}\n";
}

// Standard Apple / favicon destinations
$apple = makeIcon($source, $srcW, $srcH, 180, false);
imagepng($apple, __DIR__.'/../public/apple-touch-icon.png', 6);
imagedestroy($apple);
echo "Updated public/apple-touch-icon.png\n";

$favicon32 = makeIcon($source, $srcW, $srcH, 32, false);
imagepng($favicon32, __DIR__.'/../public/favicon-32x32.png', 6);
imagedestroy($favicon32);

$favicon16 = makeIcon($source, $srcW, $srcH, 16, false);
imagepng($favicon16, __DIR__.'/../public/favicon-16x16.png', 6);
imagedestroy($favicon16);

copy($svgPath, "{$outDir}/icon.svg");
echo "Copied icon.svg\n";

imagedestroy($source);
echo "Done.\n";
