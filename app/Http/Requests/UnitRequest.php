<?php

namespace App\Http\Requests;

use App\Models\Unit;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UnitRequest extends FormRequest
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
        $unitId = $this->route('unit')?->id;

        return [
            'period_id' => ['required', 'integer', 'exists:periods,id'],
            'correlative' => [
                'required',
                'string',
                'max:50',
                Rule::unique('units', 'correlative')->ignore($unitId),
            ],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'provider' => ['required', 'string', 'max:255'],
            'route' => ['nullable', 'string', 'max:255'],
            'vehicle_type' => ['nullable', 'string', 'max:100'],
            'service_date' => ['nullable', 'date'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'plate_number' => ['nullable', 'string', 'max:20'],
            'responsible_person' => ['nullable', 'string', 'max:255'],
            'service_type' => ['nullable', 'string', 'max:100'],
            'ruc' => ['nullable', 'string', 'max:11', 'regex:/^\d{11}$/'],
            'driver_dni' => ['nullable', 'string', 'max:20', 'regex:/^\d+$/'],
            'category' => ['nullable', 'string', 'max:20'],
            'coordinator_id' => [
                'nullable',
                'integer',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    if ($value === null || $value === '') {
                        return;
                    }

                    $exists = \App\Models\User::role(\App\Support\SystemRoles::COORDINADOR)
                        ->whereKey((int) $value)
                        ->exists();

                    if (! $exists) {
                        $fail('El coordinador seleccionado no es válido.');
                    }
                },
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $driverDni = $this->input('driver_dni');
            $plateNumber = $this->input('plate_number');
            $periodId = $this->input('period_id');

            if (! is_string($driverDni) || ! is_string($plateNumber) || blank($periodId)) {
                return;
            }

            $unitId = $this->route('unit')?->id;

            $exists = Unit::query()
                ->where('period_id', $periodId)
                ->whereRaw('LOWER(driver_dni) = ?', [mb_strtolower($driverDni)])
                ->whereRaw('UPPER(plate_number) = ?', [mb_strtoupper($plateNumber)])
                ->when($unitId, fn ($query) => $query->where('id', '!=', $unitId))
                ->exists();

            if ($exists) {
                $validator->errors()->add(
                    'driver_dni',
                    'Ya existe una unidad con el mismo DNI del conductor y placa en este periodo.',
                );
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'period_id.required' => 'El periodo es obligatorio.',
            'period_id.exists' => 'El periodo seleccionado no existe.',
            'correlative.required' => 'El correlativo es obligatorio.',
            'correlative.unique' => 'Ya existe una unidad con ese correlativo.',
            'provider.required' => 'El proveedor es obligatorio.',
            'email.email' => 'El correo no es válido.',
            'ruc.regex' => 'El RUC debe tener exactamente 11 dígitos.',
            'driver_dni.regex' => 'El DNI solo debe contener números.',
            'service_date.date' => 'La fecha no es válida.',
        ];
    }

    /**
     * @return array<string, string>
     */
    public function attributes(): array
    {
        return [
            'period_id' => 'periodo',
            'correlative' => 'correlativo',
            'phone' => 'celular',
            'email' => 'correo',
            'provider' => 'proveedor',
            'route' => 'ruta',
            'vehicle_type' => 'tipo de vehículo',
            'service_date' => 'fecha',
            'driver_name' => 'conductor',
            'plate_number' => 'placa',
            'responsible_person' => 'responsable',
            'service_type' => 'tipo de servicio',
            'ruc' => 'RUC',
            'driver_dni' => 'DNI del conductor',
            'category' => 'categoría',
            'coordinator_id' => 'coordinador',
        ];
    }

    protected function prepareForValidation(): void
    {
        $coordinatorId = $this->input('coordinator_id');

        $this->merge([
            'correlative' => trim((string) $this->input('correlative', '')),
            'phone' => $this->nullableTrim('phone'),
            'email' => $this->nullableTrim('email'),
            'provider' => trim((string) $this->input('provider', '')),
            'route' => $this->nullableTrim('route'),
            'vehicle_type' => $this->nullableTrim('vehicle_type'),
            'driver_name' => $this->nullableTrim('driver_name'),
            'plate_number' => $this->nullableTrim('plate_number'),
            'responsible_person' => $this->nullableTrim('responsible_person'),
            'service_type' => $this->nullableTrim('service_type'),
            'ruc' => $this->nullableTrim('ruc'),
            'driver_dni' => $this->nullableTrim('driver_dni'),
            'category' => $this->nullableTrim('category'),
            'coordinator_id' => $coordinatorId === '' || $coordinatorId === null
                ? null
                : (int) $coordinatorId,
        ]);

        if (! $this->filled('service_date')) {
            $this->merge(['service_date' => null]);
        }
    }

    private function nullableTrim(string $key): ?string
    {
        $value = trim((string) $this->input($key, ''));

        return $value === '' ? null : $value;
    }
}
