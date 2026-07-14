<?php

namespace App\Http\Controllers;

use App\Services\ApiPeruService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class LookupController extends Controller
{
    public function ruc(Request $request, ApiPeruService $apiPeru): JsonResponse
    {
        $validated = $request->validate([
            'ruc' => ['required', 'string', 'regex:/^\d{11}$/'],
        ], [
            'ruc.required' => 'Ingresa el RUC.',
            'ruc.regex' => 'El RUC debe tener 11 dígitos.',
        ]);

        try {
            $result = $apiPeru->lookupRuc($validated['ruc']);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'ruc' => $result['ruc'],
            'name' => $result['name'],
            'state' => $result['state'],
            'condition' => $result['condition'],
            'address' => $result['address'],
        ]);
    }

    public function dni(Request $request, ApiPeruService $apiPeru): JsonResponse
    {
        $validated = $request->validate([
            'dni' => ['required', 'string', 'min:6', 'max:20', 'regex:/^\d+$/'],
        ], [
            'dni.required' => 'Ingresa el DNI.',
            'dni.regex' => 'El DNI solo debe contener números.',
            'dni.min' => 'El DNI es demasiado corto.',
        ]);

        try {
            $result = $apiPeru->lookupDni($validated['dni']);
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 422);
        }

        return response()->json([
            'dni' => $result['dni'],
            'full_name' => $result['full_name'],
            'names' => $result['names'],
            'paternal_surname' => $result['paternal_surname'],
            'maternal_surname' => $result['maternal_surname'],
        ]);
    }
}
