<?php

namespace App\Http\Controllers;

use App\Support\CentralDomains;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ImpersonationLeaveController extends Controller
{
    public function __invoke(Request $request): Response
    {
        abort_unless((bool) $request->session()->get('impersonating'), 403);

        $returnUrl = $request->session()->get('impersonation_return');
        $host = is_string($returnUrl) ? parse_url($returnUrl, PHP_URL_HOST) : null;

        if (! is_string($host) || ! CentralDomains::contains($host)) {
            $central = CentralDomains::all()[0] ?? 'localhost';
            $scheme = $request->getScheme();
            $port = $request->getPort();
            $portSuffix = in_array($port, [80, 443, null], true) ? '' : ':'.$port;
            $returnUrl = $scheme.'://'.$central.$portSuffix.'/plataforma';
        }

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Inertia::location($returnUrl);
    }
}
