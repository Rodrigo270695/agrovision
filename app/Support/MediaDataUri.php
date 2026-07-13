<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class MediaDataUri
{
    /**
     * @return array{path: string, mime: string, size: int, checksum: string}
     */
    public static function store(string $dataUri, string $directory, string $filenamePrefix = 'file'): array
    {
        if (! preg_match('/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.+)$/i', $dataUri, $matches)) {
            throw ValidationException::withMessages([
                'media' => 'El archivo multimedia no es una imagen válida.',
            ]);
        }

        $mime = strtolower($matches[1]);
        $binary = base64_decode($matches[2], true);

        if ($binary === false) {
            throw ValidationException::withMessages([
                'media' => 'No se pudo decodificar la imagen.',
            ]);
        }

        $extension = match ($mime) {
            'image/jpeg', 'image/jpg' => 'jpg',
            'image/webp' => 'webp',
            default => 'png',
        };

        $path = trim($directory, '/').'/'.$filenamePrefix.'_'.Str::uuid().'.'.$extension;

        Storage::disk('public')->put($path, $binary);

        return [
            'path' => $path,
            'mime' => $mime === 'image/jpg' ? 'image/jpeg' : $mime,
            'size' => strlen($binary),
            'checksum' => hash('sha256', $binary),
        ];
    }
}
