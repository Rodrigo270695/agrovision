<?php

use App\Http\Controllers\ChecklistController;
use App\Http\Controllers\InductionController;
use App\Http\Controllers\LookupController;
use App\Http\Controllers\ParetoController;
use App\Http\Controllers\PeriodController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\UnitDocumentController;
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

    Route::get('pareto', [ParetoController::class, 'index'])
        ->middleware('permission:pareto.view')
        ->name('pareto.index');

    Route::post('pareto', [ParetoController::class, 'store'])
        ->middleware('permission:pareto.create')
        ->name('pareto.store');

    Route::put('pareto/{pareto}', [ParetoController::class, 'update'])
        ->middleware('permission:pareto.update')
        ->name('pareto.update');

    Route::delete('pareto/{pareto}', [ParetoController::class, 'destroy'])
        ->middleware('permission:pareto.delete')
        ->name('pareto.destroy');

    Route::post('pareto/redistribuir', [ParetoController::class, 'redistribute'])
        ->middleware('permission:pareto.update')
        ->name('pareto.redistribute');

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

    Route::post('unidades/{unit}/documentos', [UnitDocumentController::class, 'store'])
        ->middleware('permission:units.update')
        ->name('units.documents.store');

    Route::get('unidades/{unit}/documentos/{document}/descargar', [UnitDocumentController::class, 'download'])
        ->middleware('permission:units.view')
        ->name('units.documents.download');

    Route::delete('unidades/{unit}/documentos/{document}', [UnitDocumentController::class, 'destroy'])
        ->middleware('permission:units.update')
        ->name('units.documents.destroy');

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

    Route::get('inducciones', [InductionController::class, 'index'])
        ->middleware('permission:inductions.view')
        ->name('inductions.index');

    Route::post('inducciones', [InductionController::class, 'store'])
        ->middleware('permission:inductions.create')
        ->name('inductions.store');

    Route::get('inducciones/{induction}', [InductionController::class, 'show'])
        ->middleware('permission:inductions.view')
        ->name('inductions.show');

    Route::put('inducciones/{induction}', [InductionController::class, 'update'])
        ->middleware('permission:inductions.update')
        ->name('inductions.update');

    Route::patch('inducciones/{induction}/estado', [InductionController::class, 'updateStatus'])
        ->middleware('permission:inductions.update')
        ->name('inductions.status');

    Route::delete('inducciones/{induction}', [InductionController::class, 'destroy'])
        ->middleware('permission:inductions.delete')
        ->name('inductions.destroy');

    Route::post('inducciones/{induction}/asistentes', [InductionController::class, 'pullAttendees'])
        ->middleware('permission:inductions.update')
        ->name('inductions.attendees.pull');

    Route::patch('inducciones/{induction}/asistentes/{attendee}', [InductionController::class, 'updateAttendee'])
        ->middleware('permission:inductions.update')
        ->name('inductions.attendees.update');

    Route::patch('inducciones/{induction}/asistentes-estado', [InductionController::class, 'bulkUpdateAttendeeStatus'])
        ->middleware('permission:inductions.update')
        ->name('inductions.attendees.bulk-status');

    Route::post('inducciones/{induction}/asistentes/{attendee}/firma', [InductionController::class, 'signAttendee'])
        ->middleware('permission:inductions.update')
        ->name('inductions.attendees.sign');

    Route::post('inducciones/{induction}/firma-expositor', [InductionController::class, 'signSpeaker'])
        ->middleware('permission:inductions.update')
        ->name('inductions.speaker.sign');

    Route::get('inducciones/{induction}/pdf', [InductionController::class, 'pdf'])
        ->middleware('permission:inductions.view')
        ->name('inductions.pdf');

    Route::delete('inducciones/{induction}/asistentes/{attendee}', [InductionController::class, 'destroyAttendee'])
        ->middleware('permission:inductions.update')
        ->name('inductions.attendees.destroy');
});

require __DIR__.'/settings.php';
