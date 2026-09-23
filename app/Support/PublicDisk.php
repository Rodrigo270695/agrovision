<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

final class PublicDisk
{
    public static function url(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        $path = ltrim(str_replace('\\', '/', $path), '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        $disk = Storage::disk('public');
        $tenantPrefix = tenancy()->initialized
            ? 'tenants/'.tenant('id').'/'
            : null;

        if ($tenantPrefix && str_starts_with($path, $tenantPrefix)) {
            $path = substr($path, strlen($tenantPrefix));
        }

        if ($disk->exists($path)) {
            return self::relative($disk->url($path));
        }

        $legacy = storage_path('app/public/'.$path);

        if (is_file($legacy)) {
            return '/storage/'.$path;
        }

        return self::relative($disk->url($path));
    }

    private static function relative(string $url): string
    {
        $parts = parse_url($url);
        $path = $parts['path'] ?? $url;

        if (! str_starts_with($path, '/')) {
            $path = '/'.$path;
        }

        if (! empty($parts['query'])) {
            $path .= '?'.$parts['query'];
        }

        return $path;
    }
}
