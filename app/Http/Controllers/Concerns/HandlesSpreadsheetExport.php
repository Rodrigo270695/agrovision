<?php

namespace App\Http\Controllers\Concerns;

use App\Exceptions\InspectionExportTooLargeException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

trait HandlesSpreadsheetExport
{
    /**
     * @param  callable(): StreamedResponse|SymfonyResponse  $generate
     */
    protected function runSpreadsheetExport(
        Request $request,
        callable $generate,
    ): StreamedResponse|RedirectResponse|Response {
        try {
            @ini_set('memory_limit', '768M');
            @set_time_limit(300);

            return $generate();
        } catch (InspectionExportTooLargeException $exception) {
            return $this->spreadsheetExportFailureResponse(
                $request,
                $exception->getMessage(),
                422,
                'Demasiadas inspecciones para una sola descarga',
                'Acota las fechas en el listado y exporta por mes o trimestre.',
            );
        } catch (HttpExceptionInterface $exception) {
            if ($exception->getStatusCode() === 422) {
                return $this->spreadsheetExportFailureResponse(
                    $request,
                    $exception->getMessage(),
                    422,
                    'No se pudo exportar',
                    'Revisa los filtros del listado e inténtalo de nuevo.',
                );
            }

            throw $exception;
        } catch (Throwable $exception) {
            report($exception);

            return $this->spreadsheetExportFailureResponse(
                $request,
                'El servidor no pudo terminar el archivo: el volumen de datos es demasiado grande o el proceso superó el tiempo permitido. '
                .'Las inspecciones siguen guardadas en el sistema. Reduce el rango de fechas y vuelve a exportar.',
                500,
                'No se pudo generar el Excel',
                'Si el error se repite con pocos registros, contacta a soporte indicando plantilla y fechas.',
            );
        }
    }

    protected function spreadsheetExportFailureResponse(
        Request $request,
        string $message,
        int $status,
        string $title,
        ?string $hint = null,
    ): Response|RedirectResponse {
        if ($request->header('X-Inertia')) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => $message,
            ]);
        }

        $referer = $request->headers->get('referer');
        $backUrl = is_string($referer) && $referer !== ''
            ? $referer
            : route('checklists.index');

        return response()->view('errors.friendly', [
            'title' => $title,
            'message' => $message,
            'hint' => $hint,
            'status' => $status,
            'back_url' => $backUrl,
            'back_label' => 'Volver a inspecciones',
        ], $status);
    }
}