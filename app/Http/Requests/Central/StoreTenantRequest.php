<?php

namespace App\Http\Requests\Central;

use App\Support\TenantModules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTenantRequest extends FormRequest
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
            'id' => ['required', 'string', 'alpha_dash', 'max:40', Rule::unique('central.tenants', 'id')],
            'name' => ['required', 'string', 'max:120'],
            'admin_name' => ['required', 'string', 'max:120'],
            'admin_email' => ['required', 'email', 'max:255'],
            'admin_password' => ['required', 'string', 'min:8'],
            'modules' => ['nullable', 'array'],
            'modules.*' => ['boolean'],
        ];
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
    }
}
