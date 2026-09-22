<?php

use App\Http\Controllers\Central\CentralDashboardController;
use App\Http\Controllers\Central\TenantController;
use App\Http\Middleware\EnsureCentralDomain;
use App\Support\CentralDomains;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    if (CentralDomains::requestIsCentral()) {
        return Auth::check()
            ? redirect()->route('central.dashboard')
            : redirect()->route('login');
    }

    return Auth::check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

require __DIR__.'/settings.php';

Route::middleware(['auth', EnsureCentralDomain::class])->prefix('plataforma')->group(function () {
    Route::get('/', CentralDashboardController::class)->name('central.dashboard');
    Route::get('empresas', [TenantController::class, 'index'])->name('central.tenants.index');
    Route::post('empresas', [TenantController::class, 'store'])->name('central.tenants.store');
    Route::put('empresas/{tenant}', [TenantController::class, 'update'])->name('central.tenants.update');
    Route::post('empresas/{tenant}/suspender', [TenantController::class, 'suspend'])->name('central.tenants.suspend');
    Route::post('empresas/{tenant}/activar', [TenantController::class, 'activate'])->name('central.tenants.activate');
    Route::post('empresas/{tenant}/entrar', [TenantController::class, 'impersonate'])->name('central.tenants.impersonate');
});
