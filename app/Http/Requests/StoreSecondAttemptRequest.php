<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSecondAttemptRequest extends FormRequest
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
            'attempt_date' => ['required', 'date'],
            'attempt_time' => ['required', 'date_format:H:i'],
            'attempt_result' => ['required', Rule::in(['aprobado', 'desaprobado'])],
            'additional_observations' => ['nullable', 'string'],
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
            'attempt_date' => 'fecha 2da inspección',
            'attempt_time' => 'hora 2da inspección',
            'attempt_result' => 'resultado 2da inspección',
        ];
    }
}
