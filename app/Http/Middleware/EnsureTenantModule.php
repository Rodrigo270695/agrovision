<?php

namespace App\Http\Middleware;

use App\Models\TenantSetting;
use App\Support\TenantModules;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTenantModule
{
    public function handle(Request $request, Closure $next, ?string $module = null): Response
    {
        if (! tenancy()->initialized) {
            return $next($request);
        }

        $module ??= TenantModules::fromRouteName($request->route()?->getName());

        if (! $module) {
            return $next($request);
        }

        if (! TenantSetting::current()->moduleEnabled($module)) {
            abort(404);
        }

        return $next($request);
    }
}
