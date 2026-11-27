<?php

use App\Http\Middleware\EnsureCentralDomain;
use App\Http\Middleware\EnsureTenantContext;
use App\Http\Middleware\EnsureTenantModule;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\IdentifyTenantByDomain;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use App\Support\HttpErrorMessages;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Middleware\PermissionMiddleware;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Spatie\Permission\Middleware\RoleMiddleware;
use Spatie\Permission\Middleware\RoleOrPermissionMiddleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->encryptCookies(except: ['appearance', 'sidebar_state']);

        $middleware->web(prepend: [
            IdentifyTenantByDomain::class,
        ]);

        $middleware->web(append: [
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->redirectGuestsTo(fn () => route('login'));
        $middleware->redirectUsersTo(function (Request $request) {
            return tenancy()->initialized
                ? route('dashboard')
                : route('central.dashboard');
        });

        $middleware->alias([
            'role' => RoleMiddleware::class,
            'permission' => PermissionMiddleware::class,
            'role_or_permission' => RoleOrPermissionMiddleware::class,
            'central' => EnsureCentralDomain::class,
            'tenant' => EnsureTenantContext::class,
            'tenant.module' => EnsureTenantModule::class,
            'company.owner' => \App\Http\Middleware\EnsureCompanyOwner::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->respond(function (SymfonyResponse $response, \Throwable $exception, Request $request) {
            if (app()->environment('local') && config('app.debug')) {
                return $response;
            }

            $status = $response->getStatusCode();

            if (! in_array($status, [401, 402, 403, 404, 419, 422, 429, 500, 503], true)) {
                return $response;
            }

            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                return $response;
            }

            $message = HttpErrorMessages::message($status);

            if ($exception instanceof HttpExceptionInterface) {
                $custom = trim($exception->getMessage());

                if ($custom !== '' && ! str_contains(strtolower($custom), 'symfony')) {
                    $message = $custom;
                }
            }

            $title = HttpErrorMessages::title($status);

            if ($request->header('X-Inertia')) {
                return Inertia::render('Error', [
                    'status' => $status,
                    'title' => $title,
                    'message' => $message,
                ])
                    ->toResponse($request)
                    ->setStatusCode($status);
            }

            return response()->view('errors.friendly', [
                'title' => $title,
                'message' => $message,
                'status' => $status,
                'back_url' => url('/'),
                'back_label' => 'Ir al inicio',
            ], $status);
        });
    })->create();
