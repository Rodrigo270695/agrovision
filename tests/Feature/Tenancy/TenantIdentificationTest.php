<?php

use App\Models\TenantSetting;
use App\Models\User;
use App\Support\PermissionCatalog;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

test('salir de soporte redirige al panel central', function () {
    $user = User::factory()->create([
        'is_support' => true,
    ]);

    $this->actingAs($user)
        ->withSession([
            'impersonating' => true,
            'impersonation_return' => 'http://localhost/plataforma',
        ])
        ->withHeaders(['X-Inertia' => 'true'])
        ->post(route('tenants.impersonate.leave'))
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', 'http://localhost/plataforma');
});

test('un host desconocido no identifica tenant', function () {
    $this->get('http://noexiste.localhost/login')->assertNotFound();
});

test('el modulo apagado oculta la ruta de inspecciones', function () {
    $settings = TenantSetting::current();
    $modules = $settings->modules;
    $modules['checklists'] = false;
    $settings->update(['modules' => $modules]);

    app(PermissionRegistrar::class)->forgetCachedPermissions();
    PermissionCatalog::syncToDatabase();

    $user = User::factory()->create();
    $user->givePermissionTo(Permission::findByName('checklists.view', 'web'));

    $this->actingAs($user)
        ->get(route('checklists.index'))
        ->assertNotFound();
});
