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
        $needsPlace = count(array_intersect($selected, [
            SystemRoles::COORDINADOR,
            SystemRoles::INSPECTOR,
        ])) > 0;

        return [
            'roles' => ['present', 'array'],
            'roles.*' => ['string', Rule::in($roleNames)],
            'place_id' => [
                $needsPlace ? 'required' : 'nullable',
                'integer',
                Rule::exists('places', 'id')->where(
                    fn ($query) => $query->where('status', 'active'),
                ),
            ],
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
            'place_id.required' => 'El lugar es obligatorio para coordinadores e inspectores.',
            'place_id.exists' => 'Selecciona un lugar activo.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'place_id' => $this->filled('place_id') ? (int) $this->input('place_id') : null,
        ]);
    }
}
