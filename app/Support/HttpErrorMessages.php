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
            404 => 'El enlace no existe o ya no está disponible. Revisa el menú o vuelve al panel.',
            419 => 'Tu sesión caducó por inactividad. Vuelve a iniciar sesión.',
            422 => 'Revisa los datos e inténtalo de nuevo.',
            429 => 'Espera un momento y vuelve a intentarlo.',
            500 => 'Ocurrió un problema en el servidor. Si estabas descargando un archivo grande, prueba con menos datos (fechas más cortas).',
            503 => 'Estamos actualizando el sistema. Intenta en unos minutos.',
            default => 'No pudimos completar la acción. Intenta de nuevo o contacta a soporte.',
        };
    }
}