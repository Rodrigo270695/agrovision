<?php

use App\Http\Controllers\Central\CentralCertificateController;
use App\Http\Controllers\Central\CentralDashboardController;
use App\Http\Controllers\Central\CompanyReportController;
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

Route::middleware(EnsureCentralDomain::class)->group(function () {
    Route::get('validar-certificado/{token}', [CentralCertificateController::class, 'verify'])->name('central.certificates.verify');
    Route::get('validar-certificado/{token}/pdf', [CentralCertificateController::class, 'verifyPdf'])->name('central.certificates.verify.pdf');
});

Route::middleware(['auth', EnsureCentralDomain::class])->prefix('plataforma')->group(function () {
    Route::get('/', CentralDashboardController::class)->name('central.dashboard');
    Route::get('empresas', [TenantController::class, 'index'])->name('central.tenants.index');
    Route::post('empresas', [TenantController::class, 'store'])->name('central.tenants.store');
    Route::put('empresas/{tenant}', [TenantController::class, 'update'])->name('central.tenants.update');
    Route::post('empresas/{tenant}/suspender', [TenantController::class, 'suspend'])->name('central.tenants.suspend');
    Route::post('empresas/{tenant}/activar', [TenantController::class, 'activate'])->name('central.tenants.activate');
    Route::post('empresas/{tenant}/entrar', [TenantController::class, 'impersonate'])->name('central.tenants.impersonate');
    Route::get('empresas/{tenant}/reportes', [CompanyReportController::class, 'show'])->name('central.tenants.reports');
    Route::put('empresas/{tenant}/reportes/cuotas', [CompanyReportController::class, 'updateQuotas'])->name('central.tenants.reports.quotas');
    Route::get('empresas/{tenant}/reportes/pdf', [CompanyReportController::class, 'pdf'])->name('central.tenants.reports.pdf');
    Route::post('empresas/{tenant}/reportes/correo', [CompanyReportController::class, 'mail'])->name('central.tenants.reports.mail');

    Route::get('certificados/participantes', [CentralCertificateController::class, 'participants'])->name('central.certificates.participants');
    Route::post('certificados/capacitaciones', [CentralCertificateController::class, 'storeTraining'])->name('central.certificates.trainings.store');
    Route::delete('certificados/capacitaciones/{training}', [CentralCertificateController::class, 'destroyTraining'])->name('central.certificates.trainings.destroy');
    Route::post('certificados/capacitaciones/{training}/participantes', [CentralCertificateController::class, 'importParticipants'])->name('central.certificates.participants.import');
    Route::delete('certificados/participantes/{participant}', [CentralCertificateController::class, 'destroyParticipant'])->name('central.certificates.participants.destroy');

    Route::get('certificados/plantillas', [CentralCertificateController::class, 'templates'])->name('central.certificates.templates');
    Route::get('certificados/plantillas/nueva', [CentralCertificateController::class, 'create'])->name('central.certificates.templates.create');
    Route::post('certificados/plantillas', [CentralCertificateController::class, 'store'])->name('central.certificates.templates.store');
    Route::get('certificados/plantillas/{template}/editar', [CentralCertificateController::class, 'edit'])->name('central.certificates.templates.edit');
    Route::post('certificados/plantillas/{template}', [CentralCertificateController::class, 'update'])->name('central.certificates.templates.update');
    Route::delete('certificados/plantillas/{template}', [CentralCertificateController::class, 'destroy'])->name('central.certificates.templates.destroy');
    Route::get('certificados/plantillas/{template}/previsualizar', [CentralCertificateController::class, 'preview'])->name('central.certificates.templates.preview');
    Route::get('certificados/plantillas/{template}/descargar', [CentralCertificateController::class, 'download'])->name('central.certificates.templates.download');
});
