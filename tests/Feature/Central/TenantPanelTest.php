<?php

use App\Models\Tenant;
use App\Models\User;

test('el dashboard central muestra kpis de empresas', function () {
    $this->actingOnCentral();

    $user = User::factory()->create([
        'email' => 'soporte@gindelsi.pe',
    ]);

    $this->actingAs($user)
        ->get(route('central.dashboard'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('central/dashboard')
            ->has('kpis')
            ->has('charts')
            ->has('recent'));
});

test('el usuario central puede abrir configuracion', function () {
    $this->actingOnCentral();

    $user = User::factory()->create([
        'email' => 'soporte@gindelsi.pe',
    ]);

    $this->actingAs($user)
        ->get(route('profile.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page->component('settings/profile'));
});

test('el panel central lista tenants para el usuario de soporte', function () {
    $this->actingOnCentral();

    $user = User::factory()->create([
        'email' => 'soporte@gindelsi.pe',
    ]);

    $this->actingAs($user)
        ->get(route('central.tenants.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('central/tenants/index')
            ->has('tenants.data')
            ->has('filters')
            ->has('stats')
            ->has('modules'));
});

test('se puede suspender un tenant desde el central', function () {
    $this->actingOnCentral();

    $user = User::factory()->create();
    $tenant = Tenant::query()->find('agrovision');

    $this->actingAs($user)
        ->post(route('central.tenants.suspend', $tenant))
        ->assertRedirect();

    expect($tenant->fresh()->status)->toBe(Tenant::STATUS_SUSPENDED);
});

test('se puede activar un tenant suspendido', function () {
    $this->actingOnCentral();

    $user = User::factory()->create();
    $tenant = Tenant::query()->find('agrovision');
    $tenant->update(['status' => Tenant::STATUS_SUSPENDED]);

    $this->actingAs($user)
        ->post(route('central.tenants.activate', $tenant))
        ->assertRedirect();

    expect($tenant->fresh()->status)->toBe(Tenant::STATUS_ACTIVE);
});

test('se puede editar el nombre de un tenant', function () {
    $this->actingOnCentral();

    $user = User::factory()->create();
    $tenant = Tenant::query()->find('agrovision');

    $this->actingAs($user)
        ->put(route('central.tenants.update', $tenant), [
            'name' => 'Agrovision SST',
        ])
        ->assertRedirect();

    expect($tenant->fresh()->name)->toBe('Agrovision SST');
});

test('el buscador filtra tenants sin coincidencia', function () {
    $this->actingOnCentral();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('central.tenants.index', ['search' => 'zzz-no-existe']))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('tenants.total', 0)
            ->where('stats.matches', 0));
});

test('entrar como soporte desde inertia redirige al subdominio', function () {
    $this->actingOnCentral();

    $user = User::factory()->create();
    $tenant = Tenant::query()->find('agrovision');

    $this->actingAs($user)
        ->withHeaders(['X-Inertia' => 'true'])
        ->post(route('central.tenants.impersonate', $tenant))
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location');
});

test('no se puede entrar como soporte a un tenant suspendido', function () {
    $this->actingOnCentral();

    $user = User::factory()->create();
    $tenant = Tenant::query()->find('agrovision');
    $tenant->update(['status' => Tenant::STATUS_SUSPENDED]);

    $this->actingAs($user)
        ->from(route('central.tenants.index'))
        ->post(route('central.tenants.impersonate', $tenant))
        ->assertRedirect();

    expect($tenant->fresh()->status)->toBe(Tenant::STATUS_SUSPENDED);
});
