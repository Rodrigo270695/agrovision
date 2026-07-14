<?php

namespace App\Http\Requests;

use App\Support\PermissionCatalog;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RolePermissionsRequest extends FormRequest
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
            'permissions' => ['present', 'array'],
            'permissions.*' => [
                'string',
                Rule::in(PermissionCatalog::names()),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'permissions.present' => 'Debes enviar la lista de permisos.',
            'permissions.array' => 'El formato de permisos no es válido.',
            'permissions.*.in' => 'Uno de los permisos seleccionados no es válido.',
        ];
    }
}
