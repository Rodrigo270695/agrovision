<?php

namespace App\Exceptions;

use Symfony\Component\HttpKernel\Exception\HttpException;

final class InspectionExportTooLargeException extends HttpException
{
    public static function forInspections(int $count, int $limit): self
    {
        return new self(
            422,
            "Hay {$count} inspecciones con los filtros que elegiste. Por límite del servidor, cada archivo admite hasta {$limit} filas. "
            .'Ajusta las fechas en el listado y descarga por partes (mes, trimestre o coordinador).',
        );
    }
}