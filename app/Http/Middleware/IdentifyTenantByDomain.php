<?php

namespace App\Http\Middleware;

use App\Support\CentralDomains;
use Closure;
use Illuminate\Http\Request;
use Stancl\Tenancy\Middleware\InitializeTenancyByDomain;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenantByDomain
{
    public function handle(Request $request, Closure $next): Response
    {
        if (CentralDomains::contains($request->getHost())) {
            return $next($request);
        }

        return app(InitializeTenancyByDomain::class)->handle($request, $next);
    }
}
