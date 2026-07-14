<?php

namespace App\Http\Requests;

use App\Support\InductionFormOptions;
use App\Support\InductionStatuses;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class InductionRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'document_code' => ['required', 'string', 'max:50'],
            'document_revision' => ['required', 'string', 'max:20'],
            'temario' => ['nullable', 'string', 'max:5000'],
            'activity' => ['required', 'string', Rule::in(array_keys(InductionFormOptions::activities()))],
            'corrective_action' => ['nullable', 'boolean'],
            'modality' => ['required', 'string', Rule::in(array_keys(InductionFormOptions::modalities()))],
            'school' => ['required', 'string', Rule::in(array_keys(InductionFormOptions::schools()))],
            'categories' => ['required', 'array', 'min:1'],
            'categories.*' => ['string', Rule::in(array_keys(InductionFormOptions::categories()))],
            'category_other' => ['nullable', 'string', 'max:255'],
            'session_date' => ['required', 'date'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
            'estimated_minutes' => ['nullable', 'integer', 'min:1', 'max:1440'],
            'sede' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'area' => ['nullable', 'string', 'max:255'],
            'section' => ['nullable', 'string', 'max:255'],
            'zone' => ['nullable', 'string', 'max:255'],
            'target_group' => ['nullable', 'string', 'max:255'],
            'crop' => ['nullable', 'string', 'max:255'],
            'org_unit' => ['nullable', 'string', 'max:255'],
            'speaker_name' => ['nullable', 'string', 'max:255'],
            'speaker_institution' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'period_id' => ['required', 'integer', 'exists:periods,id'],
            'status' => ['nullable', 'string', Rule::in(InductionStatuses::keys())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'El tema es obligatorio.',
            'document_code.required' => 'El código del formato es obligatorio.',
            'document_revision.required' => 'La revisión del formato es obligatoria.',
            'activity.required' => 'Selecciona la actividad.',
            'modality.required' => 'Selecciona la modalidad.',
            'school.required' => 'Selecciona la escuela.',
            'categories.required' => 'Selecciona al menos una categoría.',
            'categories.min' => 'Selecciona al menos una categoría.',
            'session_date.required' => 'La fecha es obligatoria.',
            'period_id.required' => 'El periodo es obligatorio.',
            'start_time.required' => 'La hora de inicio es obligatoria.',
            'end_time.required' => 'La hora de término es obligatoria.',
            'end_time.after' => 'La hora de término debe ser posterior al inicio.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'title' => 'tema',
            'document_code' => 'código',
            'document_revision' => 'revisión',
            'temario' => 'temario',
            'activity' => 'actividad',
            'corrective_action' => 'acción correctiva',
            'modality' => 'modalidad',
            'school' => 'escuela',
            'categories' => 'categorías',
            'session_date' => 'fecha',
            'period_id' => 'periodo',
            'start_time' => 'hora inicio',
            'end_time' => 'hora término',
            'sede' => 'sede',
            'speaker_name' => 'nombre del expositor',
        ];
    }

    protected function prepareForValidation(): void
    {
        $categories = $this->input('categories', []);

        if (is_string($categories)) {
            $categories = array_filter(array_map('trim', explode(',', $categories)));
        }

        $start = trim((string) $this->input('start_time', ''));
        $end = trim((string) $this->input('end_time', ''));

        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $start)) {
            $start = substr($start, 0, 5);
        }

        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $end)) {
            $end = substr($end, 0, 5);
        }

        $this->merge([
            'title' => trim((string) $this->input('title', '')),
            'document_code' => trim((string) $this->input('document_code', '')) ?: null,
            'document_revision' => trim((string) $this->input('document_revision', '')) ?: null,
            'temario' => trim((string) $this->input('temario', '')) ?: null,
            'category_other' => trim((string) $this->input('category_other', '')) ?: null,
            'categories' => array_values(array_unique(array_filter((array) $categories))),
            'corrective_action' => filter_var($this->input('corrective_action'), FILTER_VALIDATE_BOOLEAN),
            'start_time' => $start,
            'end_time' => $end,
            'sede' => trim((string) $this->input('sede', '')) ?: null,
            'department' => trim((string) $this->input('department', '')) ?: null,
            'area' => trim((string) $this->input('area', '')) ?: null,
            'section' => trim((string) $this->input('section', '')) ?: null,
            'zone' => trim((string) $this->input('zone', '')) ?: null,
            'target_group' => trim((string) $this->input('target_group', '')) ?: null,
            'crop' => trim((string) $this->input('crop', '')) ?: null,
            'org_unit' => trim((string) $this->input('org_unit', '')) ?: null,
            'speaker_name' => trim((string) $this->input('speaker_name', '')) ?: null,
            'speaker_institution' => trim((string) $this->input('speaker_institution', '')) ?: null,
            'notes' => trim((string) $this->input('notes', '')) ?: null,
            'period_id' => $this->input('period_id') === '' || $this->input('period_id') === null
                ? null
                : (int) $this->input('period_id'),
            'estimated_minutes' => $this->input('estimated_minutes') === '' || $this->input('estimated_minutes') === null
                ? null
                : (int) $this->input('estimated_minutes'),
        ]);
    }
}
