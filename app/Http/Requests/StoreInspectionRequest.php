<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreInspectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'year' => $this->filled('year') ? $this->integer('year') : null,
            'ownership_type' => $this->filled('ownership_type') ? $this->input('ownership_type') : null,
            'plate' => $this->filled('plate')
                ? strtoupper((string) preg_replace('/\s+/', '', (string) $this->input('plate')))
                : null,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'template_short_code' => ['required', Rule::in(['TDP', 'TDC'])],
            'location' => ['nullable', 'string', 'max:255'],
            'company_name' => ['required', 'string', 'max:255'],
            'plate' => ['required', 'string', 'max:20'],
            'brand' => ['nullable', 'string', 'max:100'],
            'model' => ['nullable', 'string', 'max:100'],
            'year' => ['nullable', 'integer', 'min:1980', 'max:2100'],
            'ownership_type' => ['nullable', Rule::in(['propia', 'alquilada', 'tercero'])],
            'driver_name' => ['required', 'string', 'max:255'],
            'license_number' => ['required', 'string', 'max:50'],
            'license_class' => ['nullable', 'string', 'max:50'],
            'license_revalidation_date' => ['nullable', 'date'],
            'additional_observations' => ['nullable', 'string'],
            'attempt_date' => ['required', 'date'],
            'attempt_time' => ['required', 'date_format:H:i'],
            'attempt_result' => ['required', Rule::in(['aprobado', 'desaprobado'])],
            'answers' => ['required', 'array'],
            'answers.*.item_id' => ['required', 'uuid'],
            'answers.*.complies' => ['nullable', Rule::in(['si', 'no', 'na'])],
            'answers.*.observation' => ['nullable', 'string'],
            'answers.*.expiry_date' => ['nullable', 'date'],
            'signatures' => ['required', 'array', 'min:1'],
            'signatures.*.role' => ['required', 'string', 'max:50'],
            'signatures.*.signer_name' => ['required', 'string', 'max:255'],
            'signatures.*.signature_data' => ['required', 'string'],
            'photos' => ['nullable', 'array', 'max:12'],
            'photos.*.data_url' => ['required_with:photos', 'string'],
            'photos.*.latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'photos.*.longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'photos.*.accuracy' => ['nullable', 'numeric', 'min:0'],
            'photos.*.captured_at' => ['nullable', 'date'],
            'photos.*.checklist_item_id' => ['nullable', 'uuid'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'company_name' => 'empresa de transporte',
            'plate' => 'placa',
            'driver_name' => 'conductor',
            'license_number' => 'número de licencia',
            'attempt_date' => 'fecha de inspección',
            'attempt_time' => 'hora de inspección',
            'attempt_result' => 'resultado',
        ];
    }
}
