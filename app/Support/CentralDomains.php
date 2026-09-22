<?php

namespace App\Support;

use Illuminate\Http\Request;

final class CentralDomains
{
    /**
     * @return list<string>
     */
    public static function all(): array
    {
        return array_values(config('tenancy.central_domains', []));
    }

    public static function contains(string $host): bool
    {
        return in_array($host, self::all(), true);
    }

    public static function requestIsCentral(?Request $request = null): bool
    {
        $request ??= request();

        return self::contains($request->getHost());
    }
}
