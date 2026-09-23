<?php

namespace App\Support;

use App\Models\TenantSetting;
use Illuminate\Support\Facades\Storage;

final class PdfLogo
{
    public static function dataUri(): ?string
    {
        $absolute = self::absolutePath();

        if ($absolute === null) {
            return null;
        }

        $mime = mime_content_type($absolute) ?: 'image/png';
        $binary = file_get_contents($absolute);

        if ($binary === false || $binary === '') {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode($binary);
    }

    public static function companyName(): ?string
    {
        if (! tenancy()->initialized) {
            return null;
        }

        $name = TenantSetting::current()->name;

        return filled($name) ? $name : null;
    }

    private static function absolutePath(): ?string
    {
        if (! tenancy()->initialized) {
            return null;
        }

        Storage::forgetDisk('public');

        $settings = TenantSetting::current();

        foreach ([
            $settings->logo_path,
            $settings->login_logo_path,
            $settings->sidebar_logo_path,
        ] as $path) {
            $absolute = self::resolve((string) $path);

            if ($absolute !== null) {
                return $absolute;
            }
        }

        return null;
    }

    private static function resolve(string $path): ?string
    {
        $path = trim($path);

        if ($path === '') {
            return null;
        }

        $path = strtok($path, '?') ?: $path;

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            $path = (string) (parse_url($path, PHP_URL_PATH) ?: '');
        }

        $path = ltrim(str_replace('\\', '/', $path), '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        $tenantId = (string) tenant('id');
        $tenantPrefix = 'tenants/'.$tenantId.'/';

        if (str_starts_with($path, $tenantPrefix)) {
            $path = substr($path, strlen($tenantPrefix));
        }

        if ($path === '' || str_contains($path, '..')) {
            return null;
        }

        $candidates = [
            storage_path('app/public/tenants/'.$tenantId.'/'.$path),
            Storage::disk('public')->path($path),
            storage_path('app/public/'.$path),
            public_path('storage/tenants/'.$tenantId.'/'.$path),
            public_path('storage/'.$path),
        ];

        foreach ($candidates as $absolute) {
            if (is_file($absolute)) {
                return $absolute;
            }
        }

        return null;
    }
}
