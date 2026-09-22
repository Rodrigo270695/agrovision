<?php

namespace App\Http\Middleware;

use App\Models\TenantSetting;
use App\Support\SystemRoles;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();
        $isTenant = tenancy()->initialized;
        $settings = $isTenant && Schema::hasTable('tenant_settings')
            ? TenantSetting::current()
            : null;
        $branding = $settings?->toFrontend();

        return [
            ...parent::share($request),
            'name' => $branding['name'] ?? config('app.name'),
            'central' => ! $isTenant,
            'tenant' => $isTenant ? [
                'id' => tenant('id'),
                'status' => tenant('status'),
                ...$branding,
                'impersonating' => (bool) $request->session()->get('impersonating', false),
            ] : null,
            'auth' => [
                'user' => $isTenant
                    ? $user
                    : ($user ? [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'email_verified_at' => $user->email_verified_at,
                    ] : null),
                'roles' => fn () => $isTenant && $user && method_exists($user, 'getRoleNames')
                    ? $user->getRoleNames()->values()->all()
                    : [],
                'permissions' => fn () => $isTenant && $user && method_exists($user, 'getAllPermissions')
                    ? $user->getAllPermissions()->pluck('name')->values()->all()
                    : [],
                'is_support' => $isTenant && (
                    (bool) ($user->is_support ?? false) || (bool) $request->session()->get('impersonating', false)
                ),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'toast' => fn () => $request->session()->get('toast'),
                'unit_import' => fn () => $request->session()->get('unit_import'),
            ],
            'push' => function () use ($user, $isTenant) {
                $publicKey = config('webpush.vapid.public_key');
                $canUse = $isTenant && $user && SystemRoles::currentCanUsePush();

                return [
                    'enabled' => $canUse && filled($publicKey),
                    'vapidPublicKey' => $canUse && filled($publicKey) ? $publicKey : null,
                ];
            },
        ];
    }
}
