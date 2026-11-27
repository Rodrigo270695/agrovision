<?php

namespace App\Http\Controllers\Concerns;

use App\Exceptions\ReportExportTooLargeException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

trait HandlesReportPdfExport
{
    /**
     * @param  callable(): Response  $generate
     */
    protected function runReportPdfExport(Request $request, callable $generate): Response|RedirectResponse
    {
        try {
            @ini_set('memory_limit', '512M');
            @set_time_limit(180);

            return $generate();
        } catch (ReportExportTooLargeException $exception) {
            return $this->reportPdfFailureResponse($request, $exception->getMessage(), 422);
        } catch (Throwable $exception) {
            report($exception);

            return $this->reportPdfFailureResponse(
                $request,
                'No pudimos generar el PDF con ese volumen de datos. Prueba un rango de fechas más corto o envíalo por correo desde la misma pantalla.',
                500,
            );
        }
    }

    protected function reportPdfFailureResponse(
        Request $request,
        string $message,
        int $status,
    ): Response|RedirectResponse {
        if ($request->header('X-Inertia')) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => $message,
            ]);
        }

        $referer = $request->headers->get('referer');
        $backUrl = is_string($referer) && $referer !== '' ? $referer : url('/');

        return response()->view('errors.friendly', [
            'title' => 'No se pudo completar la descarga',
            'message' => $message,
            'status' => $status,
            'back_url' => $backUrl,
            'back_label' => 'Volver',
        ], $status);
    }
}