<?php

use App\Models\User;
use App\Support\PermissionCatalog;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

uses(\Illuminate\Foundation\Testing\RefreshDatabase::class);

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    app(PermissionRegistrar::class)->forgetCachedPermissions();
    PermissionCatalog::syncToDatabase();

    $user = User::factory()->create();
    $user->givePermissionTo(Permission::findByName('dashboard.view', 'web'));

    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('dashboard')
        ->has('kpis')
        ->has('semaforos')
        ->has('charts')
        ->has('alerts'));
});
