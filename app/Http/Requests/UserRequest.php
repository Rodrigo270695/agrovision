<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UserRequest extends FormRequest
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
        /** @var User|null $user */
        $user = $this->route('user');
        $isUpdate = $user !== null;
        $documentType = mb_strtolower((string) $this->input('document_type', 'dni'));

        $documentNumberRules = [
            'required',
            'string',
            'max:20',
            Rule::unique('users', 'document_number')->ignore($user?->id),
        ];

        if ($documentType === 'dni') {
            $documentNumberRules[] = 'regex:/^\d{8}$/';
        } else {
            $documentNumberRules[] = 'regex:/^[A-Za-z0-9\-]+$/';
        }

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'document_type' => ['required', 'string', Rule::in(['dni', 'ce', 'pasaporte'])],
            'document_number' => $documentNumberRules,
            'phone' => ['required', 'string', 'regex:/^9\d{8}$/'],
            'password' => [
                $isUpdate ? 'nullable' : 'required',
                'string',
                'min:8',
                'confirmed',
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'El nombre es obligatorio.',
            'email.required' => 'El correo es obligatorio.',
            'email.email' => 'El correo no es válido.',
            'email.unique' => 'Ya existe un usuario con ese correo.',
            'document_type.required' => 'El tipo de documento es obligatorio.',
            'document_type.in' => 'El tipo de documento no es válido.',
            'document_number.required' => 'El número de documento es obligatorio.',
            'document_number.unique' => 'Ya existe un usuario con ese documento.',
            'document_number.regex' => 'El número de documento no es válido (DNI: 8 dígitos).',
            'phone.required' => 'El celular es obligatorio.',
            'phone.regex' => 'El celular debe tener 9 dígitos y empezar con 9.',
            'password.required' => 'La contraseña es obligatoria.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'password.confirmed' => 'Las contraseñas no coinciden.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'name' => 'nombre',
            'email' => 'correo',
            'document_type' => 'tipo de documento',
            'document_number' => 'número de documento',
            'phone' => 'celular',
            'password' => 'contraseña',
            'password_confirmation' => 'confirmación de contraseña',
        ];
    }

    protected function prepareForValidation(): void
    {
        $type = mb_strtolower(trim((string) $this->input('document_type', 'dni')));
        $number = trim((string) $this->input('document_number', ''));
        $phone = preg_replace('/\D+/', '', (string) $this->input('phone', '')) ?? '';

        if ($type === 'dni') {
            $number = preg_replace('/\D+/', '', $number) ?? '';
        }

        if ($phone !== '' && ! str_starts_with($phone, '9')) {
            $phone = '9'.$phone;
        }

        $phone = mb_substr($phone, 0, 9);

        $this->merge([
            'name' => trim((string) $this->input('name', '')),
            'email' => strtolower(trim((string) $this->input('email', ''))),
            'document_type' => $type !== '' ? $type : 'dni',
            'document_number' => $number,
            'phone' => $phone,
        ]);

        if (! $this->filled('password')) {
            $this->request->remove('password');
            $this->request->remove('password_confirmation');
        }
    }
}
