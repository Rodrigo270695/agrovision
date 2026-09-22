<?php

namespace App\Http\Controllers;

use App\Support\CentralDomains;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Stancl\Tenancy\Features\UserImpersonation;

class ImpersonationController extends Controller
{
    public function __invoke(Request $request, string $token): RedirectResponse
    {
        $response = UserImpersonation::makeResponse($token);

        session([
            'impersonating' => true,
            'impersonated_by' => 'central',
            'impersonation_return' => $this->safeReturnUrl($request),
        ]);

        return $response;
    }

    private function safeReturnUrl(Request $request): string
    {
        $candidate = $request->query('return');
        $host = is_string($candidate) ? parse_url($candidate, PHP_URL_HOST) : null;

        if (is_string($host) && CentralDomains::contains($host)) {
            return $candidate;
        }

        $central = CentralDomains::all()[0] ?? 'localhost';
        $scheme = $request->getScheme();
        $port = $request->getPort();
        $portSuffix = in_array($port, [80, 443, null], true) ? '' : ':'.$port;

        return $scheme.'://'.$central.$portSuffix.'/plataforma';
    }
}
