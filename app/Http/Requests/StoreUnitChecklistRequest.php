<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUnitChecklistRequest extends FormRequest
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
            'unit_id' => [
                'required',
                'integer',
                Rule::exists('units', 'id'),
            ],
            'template_id' => [
                'required',
                'integer',
                Rule::exists('checklist_templates', 'id')->where('is_active', true),
            ],
            'inspected_on' => ['required', 'date'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'unit_id.required' => 'Debes seleccionar una unidad (placa).',
            'unit_id.exists' => 'La unidad seleccionada no existe.',
            'template_id.required' => 'Debes seleccionar el tipo de checklist.',
            'template_id.exists' => 'La plantilla seleccionada no es válida.',
            'inspected_on.required' => 'Elige la fecha de la inspección.',
            'inspected_on.date' => 'La fecha de la inspección no es válida.',
        ];
    }
}
