<?php

namespace App\Support;

final class HttpErrorMessages
{
    public static function title(int $status): string
    {
        return match ($status) {
            401 => 'Sesión no iniciada',
            402 => 'Acción no disponible',
            403 => 'Sin permiso',
            404 => 'Página no encontrada',
            419 => 'La sesión expiró',
            422 => 'No se pudo completar',
            429 => 'Demasiados intentos',
            500 => 'Algo salió mal',
            503 => 'Servicio en mantenimiento',
            default => 'Error',
        };
    }

    public static function message(int $status): string
    {
        return match ($status) {
            401 => 'Inicia sesión para continuar.',
            402 => 'Esta función no está habilitada en tu cuenta.',
            403 => 'No tienes permiso para ver esto. Si crees que es un error, pide acceso a tu coordinador.',
            404 => 'Esta ruta no está en el mapa de Agrovisión. Revisa la dirección o entra por el menú principal.',
            419 => 'Tu sesión caducó por inactividad. Vuelve a iniciar sesión.',
            422 => 'Revisa los datos e inténtalo de nuevo.',
            429 => 'Espera un momento y vuelve a intentarlo.',
            500 => 'Ocurrió un problema en el servidor. Si estabas descargando un archivo grande, prueba con menos datos (fechas más cortas).',
            503 => 'Estamos actualizando el sistema. Intenta en unos minutos.',
            default => 'No pudimos completar la acción. Intenta de nuevo o contacta a soporte.',
        };
    }

    public static function hint(int $status): ?string
    {
        return match ($status) {
            404 => 'Tip: usa el panel lateral para llegar a Unidades, Inspecciones o Reportes.',
            403 => 'Tip: si necesitas acceso, tu coordinador puede habilitarlo en Roles.',
            500 => 'Tip: en reportes PDF, acota el rango de fechas antes de descargar.',
            503 => 'Tip: la flota y los datos siguen guardados; solo estamos actualizando el sistema.',
            default => null,
        };
    }

    public static function resolveUserMessage(int $status, ?string $exceptionMessage): string
    {
        $default = self::message($status);
        $custom = trim((string) $exceptionMessage);

        if ($custom === '' || self::isFrameworkEnglishMessage($custom)) {
            return $default;
        }

        return $custom;
    }

    public static function resolveUserTitle(int $status, ?string $exceptionMessage): string
    {
        return self::title($status);
    }

    private static function isFrameworkEnglishMessage(string $message): bool
    {
        if (preg_match('/\p{L}/u', $message) && ! preg_match('/[áéíóúñÁÉÍÓÚÑ¿¡]/u', $message)) {
            if (preg_match('/\b(the|could not|not found|route|unauthorized|forbidden|server error)\b/i', $message)) {
                return true;
            }
        }

        $patterns = [
            '/^The route .+ could not be found\.?$/i',
            '/^No query results for model/i',
            '/^Unauthenticated\.?$/i',
            '/^Server Error$/i',
            '/^Forbidden\.?$/i',
            '/^Not Found\.?$/i',
        ];

        foreach ($patterns as $pattern) {
            if (preg_match($pattern, $message)) {
                return true;
            }
        }

        return false;
    }
}