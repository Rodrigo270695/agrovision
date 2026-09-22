<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateBrandingRequest;
use App\Models\Tenant;
use App\Models\TenantSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class BrandingController extends Controller
{
    public function edit(): Response
    {
        abort_unless(tenancy()->initialized, 404);

        $settings = TenantSetting::current();
        $branding = $settings->toFrontend();

        return Inertia::render('settings/empresa', [
            'branding' => [
                'name' => $settings->name,
                'legal_name' => $settings->legal_name,
                'logo' => $branding['logo'],
            ],
        ]);
    }

    public function update(UpdateBrandingRequest $request): RedirectResponse
    {
        abort_unless(tenancy()->initialized, 404);

        $settings = TenantSetting::current();
        $validated = $request->validated();

        $settings->name = $validated['name'];
        $settings->legal_name = $validated['legal_name'] ?? null;

        if ($request->hasFile('logo')) {
            $this->storeLogo($settings, $request->file('logo'));
        }

        $settings->save();

        $tenant = Tenant::query()->find(tenant('id'));

        if ($tenant) {
            $tenant->update(['name' => $settings->name]);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => 'Datos de la empresa actualizados.',
        ]);

        return to_route('empresa.edit');
    }

    private function storeLogo(TenantSetting $settings, UploadedFile $file): void
    {
        $disk = Storage::disk('public');

        foreach (['logo_path', 'login_logo_path', 'sidebar_logo_path'] as $column) {
            $old = $settings->{$column};

            if (is_string($old) && $old !== '' && ! str_starts_with($old, '/') && $disk->exists($old)) {
                $disk->delete($old);
            }
        }

        $path = $file->store('branding', 'public');

        $settings->logo_path = $path;
        $settings->login_logo_path = $path;
        $settings->sidebar_logo_path = $path;
    }
}
