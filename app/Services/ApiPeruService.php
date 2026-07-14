<?php

namespace App\Services;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

final class ApiPeruService
{
    /**
     * @return array{ruc: string, name: string, state: string|null, condition: string|null, address: string|null, raw: array<string, mixed>}
     */
    public function lookupRuc(string $ruc): array
    {
        $ruc = preg_replace('/\D+/', '', $ruc) ?? '';

        if (strlen($ruc) !== 11) {
            throw new RuntimeException('El RUC debe tener 11 dígitos.');
        }

        $data = $this->post('ruc', ['ruc' => $ruc]);

        return [
            'ruc' => (string) ($data['ruc'] ?? $ruc),
            'name' => (string) ($data['nombre_o_razon_social'] ?? $data['razon_social'] ?? $data['nombre'] ?? ''),
            'state' => isset($data['estado']) ? (string) $data['estado'] : null,
            'condition' => isset($data['condicion']) ? (string) $data['condicion'] : null,
            'address' => isset($data['direccion']) ? (string) $data['direccion'] : null,
            'raw' => $data,
        ];
    }

    /**
     * @return array{dni: string, full_name: string, names: string|null, paternal_surname: string|null, maternal_surname: string|null, raw: array<string, mixed>}
     */
    public function lookupDni(string $dni): array
    {
        $dni = preg_replace('/\D+/', '', $dni) ?? '';

        if ($dni === '') {
            throw new RuntimeException('Ingresa un DNI para consultar.');
        }

        if (strlen($dni) < 6) {
            throw new RuntimeException('El DNI es demasiado corto para consultar.');
        }

        $data = $this->post('dni', ['dni' => $dni]);

        $fullName = (string) ($data['nombre_completo'] ?? '');

        if ($fullName === '') {
            $parts = array_filter([
                $data['apellido_paterno'] ?? null,
                $data['apellido_materno'] ?? null,
                $data['nombres'] ?? null,
            ]);
            $fullName = trim(implode(' ', $parts));
        }

        return [
            'dni' => (string) ($data['numero'] ?? $dni),
            'full_name' => $fullName,
            'names' => isset($data['nombres']) ? (string) $data['nombres'] : null,
            'paternal_surname' => isset($data['apellido_paterno']) ? (string) $data['apellido_paterno'] : null,
            'maternal_surname' => isset($data['apellido_materno']) ? (string) $data['apellido_materno'] : null,
            'raw' => $data,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function post(string $endpoint, array $payload): array
    {
        $baseUrl = rtrim((string) config('services.apiperu.base_url'), '/');
        $token = (string) config('services.apiperu.token');

        if ($baseUrl === '' || $token === '') {
            throw new RuntimeException('API Peru no está configurada. Revisa APIPERU_BASE_URL y APIPERU_TOKEN.');
        }

        try {
            $response = Http::acceptJson()
                ->asJson()
                ->withToken($token)
                ->timeout(20)
                ->post("{$baseUrl}/{$endpoint}", $payload)
                ->throw()
                ->json();
        } catch (RequestException $exception) {
            $body = $exception->response?->json();
            $message = is_array($body)
                ? (string) ($body['message'] ?? $body['msg'] ?? 'No se pudo consultar el servicio.')
                : 'No se pudo consultar el servicio.';

            throw new RuntimeException($message, previous: $exception);
        }

        if (! is_array($response)) {
            throw new RuntimeException('Respuesta inválida del servicio.');
        }

        if (($response['success'] ?? false) !== true) {
            throw new RuntimeException((string) ($response['message'] ?? 'No se encontraron datos.'));
        }

        $data = $response['data'] ?? null;

        if (! is_array($data)) {
            throw new RuntimeException('No se encontraron datos.');
        }

        return $data;
    }
}
