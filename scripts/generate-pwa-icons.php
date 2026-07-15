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
 * Escala icon.png a un canvas cuadrado.
 * Fondo negro (coincide con el logo). maskable deja zona segura.
 */
function makeIcon(GdImage $source, int $srcW, int $srcH, int $size, bool $maskable = false): GdImage
{
    $canvas = imagecreatetruecolor($size, $size);
    imagealphablending($canvas, false);
    imagesavealpha($canvas, true);

    $black = imagecolorallocate($canvas, 0, 0, 0);
    imagefilledrectangle($canvas, 0, 0, $size, $size, $black);
    imagealphablending($canvas, true);

    $paddingRatio = $maskable ? 0.18 : 0.04;
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

function savePng(GdImage $image, string $path): void
{
    imagepng($image, $path, 6);
    imagedestroy($image);
    echo "Created {$path}\n";
}

foreach ($sizes as $size) {
    savePng(
        makeIcon($source, $srcW, $srcH, $size, false),
        "{$outDir}/icon-{$size}x{$size}.png",
    );
}

foreach ([192, 512] as $size) {
    savePng(
        makeIcon($source, $srcW, $srcH, $size, true),
        "{$outDir}/maskable-{$size}x{$size}.png",
    );
}

savePng(makeIcon($source, $srcW, $srcH, 180, false), "{$publicDir}/apple-touch-icon.png");
savePng(makeIcon($source, $srcW, $srcH, 32, false), "{$publicDir}/favicon-32x32.png");
savePng(makeIcon($source, $srcW, $srcH, 16, false), "{$publicDir}/favicon-16x16.png");

// favicon.ico (BMP 32-bit sin compresión embebido; cabecera ICO estándar)
$ico16 = makeIcon($source, $srcW, $srcH, 16, false);
$ico32 = makeIcon($source, $srcW, $srcH, 32, false);
file_put_contents("{$publicDir}/favicon.ico", buildIco([$ico16, $ico32]));
imagedestroy($ico16);
imagedestroy($ico32);
echo "Created {$publicDir}/favicon.ico\n";

// Eliminar SVG del Laravel si existía
foreach (["{$publicDir}/favicon.svg", "{$outDir}/icon.svg"] as $legacySvg) {
    if (is_file($legacySvg)) {
        unlink($legacySvg);
        echo "Removed {$legacySvg}\n";
    }
}

imagedestroy($source);
echo "Done.\n";

/**
 * @param  list<GdImage>  $images
 */
function buildIco(array $images): string
{
    $count = count($images);
    $offset = 6 + ($count * 16);
    $entries = '';
    $blobs = '';

    foreach ($images as $image) {
        $w = imagesx($image);
        $h = imagesy($image);
        $bmp = gdToBmp32($image);
        $size = strlen($bmp);

        $entries .= pack(
            'CCCCvvVV',
            $w >= 256 ? 0 : $w,
            $h >= 256 ? 0 : $h,
            0,
            0,
            1,
            32,
            $size,
            $offset,
        );

        $blobs .= $bmp;
        $offset += $size;
    }

    return pack('vvv', 0, 1, $count).$entries.$blobs;
}

function gdToBmp32(GdImage $image): string
{
    $w = imagesx($image);
    $h = imagesy($image);
    $rowSize = $w * 4;
    $pixelData = '';

    for ($y = $h - 1; $y >= 0; $y--) {
        for ($x = 0; $x < $w; $x++) {
            $rgba = imagecolorat($image, $x, $y);
            $a = ($rgba & 0x7F000000) >> 24;
            $r = ($rgba >> 16) & 0xFF;
            $g = ($rgba >> 8) & 0xFF;
            $b = $rgba & 0xFF;
            // GD alpha 0=opaco … 127=transparente → BMP 0=transparente … 255=opaco
            $alpha = (int) round((127 - $a) / 127 * 255);
            $pixelData .= chr($b).chr($g).chr($r).chr($alpha);
        }
    }

    $headerSize = 40;
    $dib = pack(
        'VVVvvVVVVVV',
        $headerSize,
        $w,
        $h * 2, // altura * 2 en ICO (XOR + AND)
        1,
        32,
        0,
        strlen($pixelData),
        0,
        0,
        0,
        0,
    );

    // Máscara AND vacía (bits alineados a 32)
    $andRow = (int) (ceil($w / 32) * 4);
    $andMask = str_repeat("\0", $andRow * $h);

    return $dib.$pixelData.$andMask;
}
