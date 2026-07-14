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
                Rule::exists('units', 'id')->where(function ($query) {
                    $query->whereIn('period_id', function ($sub) {
                        $sub->select('id')
                            ->from('periods')
                            ->where('status', 'active');
                    });
                }),
            ],
            'template_id' => [
                'required',
                'integer',
                Rule::exists('checklist_templates', 'id')->where('is_active', true),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'unit_id.required' => 'Debes seleccionar una unidad (placa).',
            'unit_id.exists' => 'La unidad debe pertenecer a un periodo activo.',
            'template_id.required' => 'Debes seleccionar el tipo de checklist.',
            'template_id.exists' => 'La plantilla seleccionada no es válida.',
        ];
    }
}
