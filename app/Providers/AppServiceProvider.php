<?php

namespace App\Providers;

use App\Models\UnitChecklist;
use App\Models\UnitChecklistPhoto;
use App\Support\PdfLogo;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\View;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\LoginResponse;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->instance(LoginResponse::class, new class implements LoginResponse
        {
            public function toResponse($request)
            {
                if (! tenancy()->initialized) {
                    return redirect()->intended(route('central.dashboard'));
                }

                return redirect()->intended(route('dashboard'));
            }
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Route::bind('checklist', fn (string $value) => UnitChecklist::query()->findOrFail($value));
        Route::bind('photo', fn (string $value) => UnitChecklistPhoto::query()->findOrFail($value));

        View::composer('pdfs.*', function ($view): void {
            $data = $view->getData();

            if (! array_key_exists('logoSrc', $data)) {
                $view->with('logoSrc', PdfLogo::dataUri());
            }

            if (! array_key_exists('companyName', $data)) {
                $view->with('companyName', PdfLogo::companyName());
            }
        });

        Gate::before(function ($user, $ability) {
            if (! tenancy()->initialized) {
                return null;
            }

            if (($user->is_support ?? false) === true) {
                return true;
            }

            return method_exists($user, 'hasRole') && $user->hasRole('superadmin')
                ? true
                : null;
        });
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
