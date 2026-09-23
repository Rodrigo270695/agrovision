<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

class PublicFileController extends Controller
{
    public function show(string $path): Response
    {
        $path = ltrim(str_replace('\\', '/', $path), '/');

        if ($path === '' || str_contains($path, '..')) {
            abort(404);
        }

        $tenantPrefix = tenancy()->initialized
            ? 'tenants/'.tenant('id').'/'
            : null;

        if ($tenantPrefix && str_starts_with($path, $tenantPrefix)) {
            $path = substr($path, strlen($tenantPrefix));
        }

        $disk = Storage::disk('public');

        if ($disk->exists($path)) {
            return $disk->response($path);
        }

        $legacy = storage_path('app/public/'.$path);

        if (is_file($legacy)) {
            return response()->file($legacy);
        }

        abort(404);
    }
}
