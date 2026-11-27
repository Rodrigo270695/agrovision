<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

final class ReportExportTooLargeException extends HttpException
{
    public static function forInspections(int $count, int $limit): self
    {
        return new self(
            422,
            "Hay {$count} inspecciones en el periodo. El PDF completo admite hasta {$limit}. "
            .'Reduce las fechas (por ejemplo un mes o una semana) o usa «Enviar por correo» con un rango más corto.',
        );
    }

    public static function forInductions(int $count, int $limit): self
    {
        return new self(
            422,
            "Hay {$count} capacitaciones en el periodo. El PDF admite hasta {$limit}. "
            .'Acota las fechas del reporte.',
        );
    }
}