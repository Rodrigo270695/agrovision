<?php

namespace App\Support;

final class ImageShrinker
{
    /**
     * Devuelve JPEG reducido. Sube la memoria solo durante el decode:
     * una foto de celular ocupa ~60 MB al abrirla, aunque el archivo pese 3 MB.
     */
    public static function toJpeg(string $binary, int $maxSide = 1280, int $quality = 72): ?string
    {
        if ($binary === '' || ! function_exists('imagecreatefromstring')) {
            return null;
        }

        $previous = ini_get('memory_limit');
        @ini_set('memory_limit', '512M');

        try {
            $image = @imagecreatefromstring($binary);

            if ($image === false) {
                return null;
            }

            $width = imagesx($image);
            $height = imagesy($image);

            if ($width < 1 || $height < 1) {
                imagedestroy($image);

                return null;
            }

            $scale = min(1, $maxSide / max($width, $height));
            $nextWidth = max(1, (int) round($width * $scale));
            $nextHeight = max(1, (int) round($height * $scale));
            $canvas = imagecreatetruecolor($nextWidth, $nextHeight);

            if ($canvas === false) {
                imagedestroy($image);

                return null;
            }

            $white = imagecolorallocate($canvas, 255, 255, 255);
            imagefilledrectangle($canvas, 0, 0, $nextWidth, $nextHeight, $white);
            imagecopyresampled(
                $canvas,
                $image,
                0,
                0,
                0,
                0,
                $nextWidth,
                $nextHeight,
                $width,
                $height,
            );
            imagedestroy($image);

            ob_start();
            imagejpeg($canvas, null, max(40, min(85, $quality)));
            $jpeg = ob_get_clean();
            imagedestroy($canvas);

            return is_string($jpeg) && $jpeg !== '' ? $jpeg : null;
        } finally {
            if (is_string($previous) && $previous !== '') {
                @ini_set('memory_limit', $previous);
            }
        }
    }
}
