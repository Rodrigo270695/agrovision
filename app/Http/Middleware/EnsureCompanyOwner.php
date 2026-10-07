<?php

namespace App\Http\Middleware;

use App\Support\SystemRoles;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureCompanyOwner
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless(
            $user && method_exists($user, 'hasRole') && $user->hasRole(SystemRoles::SUPERADMIN),
            403,
        );

        abort_if(
            (bool) ($user->is_support ?? false) || (bool) $request->session()->get('impersonating'),
            403,
        );

        return $next($request);
    }
}
