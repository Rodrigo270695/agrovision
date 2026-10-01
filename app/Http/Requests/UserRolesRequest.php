<?php

namespace App\Http\Requests;

use App\Support\SystemRoles;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class UserRolesRequest extends FormRequest
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
        $roleNames = Role::query()
            ->where('guard_name', 'web')
            ->pluck('name')
            ->all();

        $selected = array_map(
            static fn ($name) => mb_strtolower(trim((string) $name)),
            (array) $this->input('roles', []),
        );
        $needsPlaces = in_array(SystemRoles::COORDINADOR, $selected, true)
            || in_array(SystemRoles::INSPECTOR, $selected, true);
        $activePlace = Rule::exists('places', 'id')->where(
            fn ($query) => $query->where('status', 'active'),
        );

        return [
            'roles' => ['present', 'array'],
            'roles.*' => ['string', Rule::in($roleNames)],
            'place_ids' => [
                $needsPlaces ? 'required' : 'nullable',
                'array',
                $needsPlaces ? 'min:1' : 'max:0',
            ],
            'place_ids.*' => ['integer', 'distinct', $activePlace],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'roles.present' => 'Debes enviar la lista de roles.',
            'roles.array' => 'El formato de roles no es válido.',
            'roles.*.in' => 'Uno de los roles seleccionados no es válido.',
            'place_ids.required' => 'Selecciona al menos un lugar.',
            'place_ids.min' => 'Selecciona al menos un lugar.',
            'place_ids.*.exists' => 'Selecciona lugares activos.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $selected = array_map(
            static fn ($name) => mb_strtolower(trim((string) $name)),
            (array) $this->input('roles', []),
        );
        $needsPlaces = in_array(SystemRoles::COORDINADOR, $selected, true)
            || in_array(SystemRoles::INSPECTOR, $selected, true);

        $placeIds = $needsPlaces
            ? collect((array) $this->input('place_ids', []))
                ->filter(fn ($id) => $id !== null && $id !== '')
                ->map(fn ($id) => (int) $id)
                ->unique()
                ->values()
                ->all()
            : [];

        $this->merge([
            'place_ids' => $placeIds,
        ]);
    }
}
