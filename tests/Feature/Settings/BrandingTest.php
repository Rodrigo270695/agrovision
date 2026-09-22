<?php

use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('la pagina de empresa esta disponible en el tenant', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('empresa.edit'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('settings/empresa')
            ->has('branding.name')
            ->has('branding.legal_name')
            ->has('branding.logo'));
});

test('el panel central no expone la configuracion de empresa', function () {
    $this->actingOnCentral();

    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('empresa.edit'))
        ->assertNotFound();
});

test('se pueden actualizar el nombre y el logo de la empresa', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    $logo = UploadedFile::fake()->image('macga.png', 240, 240);

    $this->actingAs($user)
        ->post(route('empresa.update'), [
            'name' => 'Macga',
            'legal_name' => 'Macga S.A.C.',
            'logo' => $logo,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('empresa.edit'));

    $settings = TenantSetting::current();

    expect($settings->name)->toBe('Macga')
        ->and($settings->legal_name)->toBe('Macga S.A.C.')
        ->and($settings->logo_path)->not->toBeNull();

    Storage::disk('public')->assertExists($settings->logo_path);

    expect(Tenant::query()->find('agrovision')?->name)->toBe('Macga');
});
