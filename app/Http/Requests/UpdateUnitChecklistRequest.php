<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUnitChecklistRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'location' => ['nullable', 'string', 'max:255'],
            'transport_company' => ['nullable', 'string', 'max:255'],
            'vehicle_info' => ['nullable', 'string', 'max:255'],
            'license_number' => ['nullable', 'string', 'max:50'],
            'license_class' => ['nullable', 'string', 'max:50'],
            'license_revalidation_on' => ['nullable', 'date'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'first_inspected_on' => ['nullable', 'date'],
            'first_inspected_time' => ['nullable', 'date_format:H:i'],
            'second_inspected_on' => ['nullable', 'date'],
            'second_inspected_time' => ['nullable', 'date_format:H:i'],
            'first_result' => ['nullable', Rule::in(['approved', 'rejected'])],
            'second_result' => ['nullable', Rule::in(['approved', 'rejected'])],
            'additional_observations' => ['nullable', 'string', 'max:5000'],
            'status' => ['nullable', Rule::in(['draft', 'completed'])],
            'seal' => ['nullable', 'boolean'],
            'answers' => ['nullable', 'array'],
            'answers.*.checklist_item_id' => ['required', 'integer', 'exists:checklist_items,id'],
            'answers.*.first_value' => ['nullable', Rule::in(['yes', 'no'])],
            'answers.*.second_value' => ['nullable', Rule::in(['yes', 'no'])],
            'answers.*.observations' => ['nullable', 'string', 'max:1000'],
            'signatures' => ['nullable', 'array'],
            'signatures.*.signature_role_id' => ['required', 'integer', 'exists:checklist_signature_roles,id'],
            'signatures.*.signer_name' => ['nullable', 'string', 'max:255'],
            'signatures.*.signature_data_url' => ['nullable', 'string'],
            'signatures.*.clear_signature' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [];
    }

    protected function prepareForValidation(): void
    {
        $nullable = [
            'location',
            'transport_company',
            'vehicle_info',
            'license_number',
            'license_class',
            'driver_name',
            'first_inspected_time',
            'second_inspected_time',
            'additional_observations',
            'first_result',
            'second_result',
        ];

        $merged = [];

        foreach ($nullable as $key) {
            if (! $this->has($key)) {
                continue;
            }

            $value = trim((string) $this->input($key, ''));
            $merged[$key] = $value === '' ? null : $value;
        }

        foreach (['license_revalidation_on', 'first_inspected_on', 'second_inspected_on'] as $key) {
            if ($this->has($key) && $this->input($key) === '') {
                $merged[$key] = null;
            }
        }

        if ($this->has('answers') && is_array($this->input('answers'))) {
            $merged['answers'] = collect($this->input('answers'))
                ->map(function ($answer) {
                    return [
                        'checklist_item_id' => $answer['checklist_item_id'] ?? null,
                        'first_value' => ($answer['first_value'] ?? '') === '' ? null : $answer['first_value'],
                        'second_value' => ($answer['second_value'] ?? '') === '' ? null : $answer['second_value'],
                        'observations' => trim((string) ($answer['observations'] ?? '')) === ''
                            ? null
                            : trim((string) $answer['observations']),
                    ];
                })
                ->all();
        }

        if ($this->has('signatures') && is_array($this->input('signatures'))) {
            $merged['signatures'] = collect($this->input('signatures'))
                ->map(function ($signature) {
                    $name = trim((string) ($signature['signer_name'] ?? ''));

                    return [
                        'signature_role_id' => $signature['signature_role_id'] ?? null,
                        'signer_name' => $name === '' ? null : $name,
                        'signature_data_url' => $signature['signature_data_url'] ?? null,
                        'clear_signature' => (bool) ($signature['clear_signature'] ?? false),
                    ];
                })
                ->all();
        }

        if ($this->has('seal')) {
            $merged['seal'] = filter_var($this->input('seal'), FILTER_VALIDATE_BOOLEAN);
        }

        if ($merged !== []) {
            $this->merge($merged);
        }
    }
}
