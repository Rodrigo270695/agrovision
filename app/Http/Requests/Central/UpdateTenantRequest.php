<?php

namespace App\Http\Requests\Central;

use App\Models\Tenant;
use App\Support\TenantModules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

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
