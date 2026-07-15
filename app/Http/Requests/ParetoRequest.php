<?php

namespace App\Http\Requests;

use App\Support\ParetoCheckTypes;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ParetoRequest extends FormRequest
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
            'template_type' => ['required', 'string', Rule::in(['tdp', 'tdc'])],
            'parent_id' => ['nullable', 'integer', 'exists:pareto,id'],
            'item_number' => ['required', 'string', 'max:20'],
            'label' => ['required', 'string', 'max:500'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'check_type' => ['required', 'string', Rule::in(ParetoCheckTypes::keys())],
            'weight' => ['required', 'numeric', 'min:0', 'max:100'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'template_type' => 'plantilla',
            'item_number' => 'número',
            'label' => 'exigencia',
            'check_type' => 'tipo de check',
            'weight' => 'peso',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'item_number' => trim((string) $this->input('item_number', '')),
            'label' => trim((string) $this->input('label', '')),
            'parent_id' => $this->input('parent_id') === '' || $this->input('parent_id') === null
                ? null
                : (int) $this->input('parent_id'),
            'sort_order' => $this->input('sort_order') === '' || $this->input('sort_order') === null
                ? null
                : (int) $this->input('sort_order'),
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN),
        ]);
    }
}
