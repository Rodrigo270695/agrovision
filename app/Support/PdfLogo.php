<?php

namespace App\Support;

use App\Models\TenantSetting;
use Illuminate\Support\Facades\Storage;

final class PdfLogo
{
    public static function dataUri(): ?string
    {
        $tenantLogo = null;

        if (tenancy()->initialized) {
            $path = TenantSetting::current()->logo_path;
            if (filled($path) && ! str_starts_with($path, 'http://') && ! str_starts_with($path, 'https://')) {
                $absolute = str_starts_with($path, '/')
                    ? public_path(ltrim($path, '/'))
                    : Storage::disk('public')->path($path);

                if (is_file($absolute)) {
                    $tenantLogo = $absolute;
                }
            }
        }

        $candidates = array_filter([
            $tenantLogo,
            public_path('agro-logo.png'),
            public_path('logo.png'),
            public_path('agro.png'),
            public_path('icon.png'),
        ]);

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
