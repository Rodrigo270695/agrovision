<?php

namespace App\Http\Middleware;

use App\Support\CentralDomains;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCentralDomain
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! CentralDomains::contains($request->getHost())) {
            abort(404);
        }

        return $next($request);
    }
}
