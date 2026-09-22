<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantContext
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! tenancy()->initialized) {
            abort(404);
        }

        $tenant = tenant();

        if ($tenant && method_exists($tenant, 'isActive') && ! $tenant->isActive()) {
            abort(403, 'Esta empresa está suspendida.');
        }

        return $next($request);
    }
}
