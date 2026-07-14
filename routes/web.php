<?php

use App\Http\Controllers\ChecklistController;
use App\Http\Controllers\LookupController;
use App\Http\Controllers\PeriodController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')
        ->middleware('permission:dashboard.view')
        ->name('dashboard');

    Route::get('usuarios', [UserController::class, 'index'])
        ->middleware('permission:users.view')
        ->name('users.index');

    Route::post('usuarios', [UserController::class, 'store'])
        ->middleware('permission:users.create')
        ->name('users.store');

    Route::put('usuarios/{user}', [UserController::class, 'update'])
        ->middleware('permission:users.update')
        ->name('users.update');

    Route::put('usuarios/{user}/roles', [UserController::class, 'syncRoles'])
        ->middleware('permission:users.update')
        ->name('users.roles.sync');

    Route::delete('usuarios/{user}', [UserController::class, 'destroy'])
        ->middleware('permission:users.delete')
        ->name('users.destroy');

    Route::get('roles', [RoleController::class, 'index'])
        ->middleware('permission:roles.view')
        ->name('roles.index');

    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('permission:roles.create')
        ->name('roles.store');

    Route::put('roles/{role}', [RoleController::class, 'update'])
        ->middleware('permission:roles.update')
        ->name('roles.update');

    Route::put('roles/{role}/permissions', [RoleController::class, 'syncPermissions'])
        ->middleware('permission:roles.assign')
        ->name('roles.permissions.sync');

    Route::delete('roles/{role}', [RoleController::class, 'destroy'])
        ->middleware('permission:roles.delete')
        ->name('roles.destroy');

    Route::get('periodos', [PeriodController::class, 'index'])
        ->middleware('permission:periods.view')
        ->name('periods.index');

    Route::post('periodos', [PeriodController::class, 'store'])
        ->middleware('permission:periods.create')
        ->name('periods.store');

    Route::put('periodos/{period}', [PeriodController::class, 'update'])
        ->middleware('permission:periods.update')
        ->name('periods.update');

    Route::delete('periodos/{period}', [PeriodController::class, 'destroy'])
        ->middleware('permission:periods.delete')
        ->name('periods.destroy');

    Route::get('unidades', [UnitController::class, 'index'])
        ->middleware('permission:units.view')
        ->name('units.index');

    Route::post('consultas/ruc', [LookupController::class, 'ruc'])
        ->middleware('permission:units.create|units.update')
        ->name('lookups.ruc');

    Route::post('consultas/dni', [LookupController::class, 'dni'])
        ->middleware('permission:units.create|units.update')
        ->name('lookups.dni');

    Route::get('unidades/exportar', [UnitController::class, 'export'])
        ->middleware('permission:units.view')
        ->name('units.export');

    Route::get('unidades/plantilla', [UnitController::class, 'downloadTemplate'])
        ->middleware('permission:units.create')
        ->name('units.template');

    Route::post('unidades/importar', [UnitController::class, 'import'])
        ->middleware('permission:units.create')
        ->name('units.import');

    Route::post('unidades', [UnitController::class, 'store'])
        ->middleware('permission:units.create')
        ->name('units.store');

    Route::put('unidades/{unit}', [UnitController::class, 'update'])
        ->middleware('permission:units.update')
        ->name('units.update');

    Route::delete('unidades/{unit}', [UnitController::class, 'destroy'])
        ->middleware('permission:units.delete')
        ->name('units.destroy');

    Route::get('inspecciones', [ChecklistController::class, 'index'])
        ->middleware('permission:checklists.view')
        ->name('checklists.index');

    Route::post('inspecciones', [ChecklistController::class, 'store'])
        ->middleware('permission:checklists.create')
        ->name('checklists.store');

    Route::get('inspecciones/{checklist}/editar', [ChecklistController::class, 'edit'])
        ->middleware('permission:checklists.update')
        ->name('checklists.edit');

    Route::put('inspecciones/{checklist}', [ChecklistController::class, 'update'])
        ->middleware('permission:checklists.update')
        ->name('checklists.update');

    Route::post('inspecciones/{checklist}/fotos', [ChecklistController::class, 'storePhoto'])
        ->middleware('permission:checklists.update')
        ->name('checklists.photos.store');

    Route::delete('inspecciones/{checklist}/fotos/{photo}', [ChecklistController::class, 'destroyPhoto'])
        ->middleware('permission:checklists.update')
        ->name('checklists.photos.destroy');

    Route::get('inspecciones/{checklist}/pdf', [ChecklistController::class, 'pdf'])
        ->middleware('permission:checklists.view')
        ->name('checklists.pdf');

    Route::delete('inspecciones/{checklist}', [ChecklistController::class, 'destroy'])
        ->middleware('permission:checklists.delete')
        ->name('checklists.destroy');
});

require __DIR__.'/settings.php';
