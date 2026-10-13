<?php

namespace App\Http\Requests\Central;

use App\Models\Tenant;
use App\Support\TenantModules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'status' => ['sometimes', 'required', Rule::in([Tenant::STATUS_ACTIVE, Tenant::STATUS_SUSPENDED])],
            'modules' => ['nullable', 'array'],
            'modules.*' => ['boolean'],
            'subdomain' => ['sometimes', 'required', 'string', 'max:40', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if (! $this->filled('subdomain') || $validator->errors()->has('subdomain')) {
                return;
            }

            $subdomain = (string) $this->input('subdomain');

            if (in_array($subdomain, ['www', 'mail', 'ftp', 'cpanel', 'webmail'], true)) {
                $validator->errors()->add('subdomain', 'Ese subdominio está reservado.');

                return;
            }

            /** @var Tenant $tenant */
            $tenant = $this->route('tenant');

            foreach (config('tenancy.base_domains', []) as $base) {
                $hostname = $subdomain.'.'.trim((string) $base);
                $taken = DB::table('domains')
                    ->where('domain', $hostname)
                    ->where('tenant_id', '!=', $tenant->id)
                    ->exists();

                if ($taken) {
                    $validator->errors()->add('subdomain', 'Ese subdominio ya está en uso.');

                    return;
                }
            }
        });
    }

    /**
     * @return array<string, mixed>
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('modules') && is_array($this->input('modules'))) {
            $this->merge([
                'modules' => TenantModules::sanitize($this->input('modules')),
            ]);
        }

        if ($this->filled('subdomain')) {
            $this->merge([
                'subdomain' => strtolower(trim((string) $this->input('subdomain'))),
            ]);
        }
    }
}
