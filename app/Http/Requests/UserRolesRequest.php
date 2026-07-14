<?php

namespace App\Http\Requests;

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

        return [
            'roles' => ['present', 'array'],
            'roles.*' => ['string', Rule::in($roleNames)],
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
        ];
    }
}
