<?php

use App\Http\Controllers\InspectionController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return Auth::check()
        ? redirect()->route('dashboard')
        : redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    Route::get('inspecciones', [InspectionController::class, 'index'])->name('inspections.index');
    Route::get('inspecciones/{type}/nueva', [InspectionController::class, 'create'])
        ->whereIn('type', ['tdp', 'tdc', 'TDP', 'TDC'])
        ->name('inspections.create');
    Route::post('inspecciones', [InspectionController::class, 'store'])->name('inspections.store');
    Route::get('inspecciones/{inspection}/reinspeccion', [InspectionController::class, 'reinspect'])
        ->name('inspections.reinspect');
    Route::post('inspecciones/{inspection}/reinspeccion', [InspectionController::class, 'storeSecond'])
        ->name('inspections.store-second');
});

require __DIR__.'/settings.php';
