<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use RuntimeException;

final class SignatureImage
{
    /**
     * Guarda una firma/huella en imagen desde data URL y retorna el path relativo en disk public.
     */
    public static function storeFromDataUrl(string $dataUrl, string $directory): string
    {
        if (! preg_match('/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i', $dataUrl, $matches)) {
            throw new RuntimeException('La firma no es una imagen válida.');
        }

        $binary = base64_decode($matches[2], true);

        if ($binary === false || $binary === '') {
            throw new RuntimeException('No se pudo leer la firma.');
        }

        if (strlen($binary) > 8_000_000) {
            throw new RuntimeException('La imagen es demasiado pesada.');
        }

        $extension = strtolower($matches[1]) === 'jpeg' ? 'jpg' : strtolower($matches[1]);
        $path = trim($directory, '/').'/'.uniqid('firma_', true).'.'.$extension;

        Storage::disk('public')->put($path, $binary);

        return $path;
    }
}
