<?php

namespace App\Support;

final class PdfLogo
{
    public static function dataUri(): ?string
    {
        $candidates = [
            public_path('agro-logo.png'),
            public_path('logo.png'),
            public_path('agro.png'),
            public_path('icon.png'),
        ];

        foreach ($candidates as $absolute) {
            if (! is_file($absolute)) {
                continue;
            }

            $mime = mime_content_type($absolute) ?: 'image/png';
            $binary = file_get_contents($absolute);

            if ($binary === false || $binary === '') {
                continue;
            }

            return 'data:'.$mime.';base64,'.base64_encode($binary);
        }

        return null;
    }
}
