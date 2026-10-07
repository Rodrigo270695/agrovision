<?php

namespace App\Http\Controllers;

use App\Mail\OwnerReportMail;
use App\Support\OwnerReports;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class OwnerReportController extends Controller
{
    public function show(Request $request, OwnerReports $reports): Response
    {
        return Inertia::render('company-reports/index', [
            'company' => [
                'id' => (string) tenant('id'),
                'name' => (string) tenant('name'),
            ],
            'baseUrl' => '/reportes-dueno',
            ...$reports->build($request),
        ]);
    }

    public function updateQuotas(Request $request, OwnerReports $reports): RedirectResponse
    {
        $validated = $request->validate([
            'quotas' => ['required', 'array'],
            'quotas.*.user_id' => ['required', 'integer'],
            'quotas.*.daily_quota' => ['nullable', 'integer', 'min:1', 'max:500'],
        ], [
            'quotas.*.daily_quota.min' => 'La cuota mínima es 1 inspección por día.',
            'quotas.*.daily_quota.max' => 'La cuota no puede pasar de 500.',
        ]);

        $reports->saveQuotas($validated['quotas']);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Cuotas de inspectores guardadas.',
        ]);
    }

    public function pdf(Request $request, OwnerReports $reports): HttpResponse
    {
        $request->merge(['export' => true]);
        $company = (string) tenant('name');
        $binary = $reports->pdfBinary($reports->build($request), $company);
        $name = 'reportes-'.tenant('id').'.pdf';

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
        ]);
    }

    public function mail(Request $request, OwnerReports $reports): RedirectResponse
    {
        $email = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ], [
            'email.required' => 'Escribe el correo de destino.',
            'email.email' => 'El correo no es válido.',
        ])['email'];

        $request->merge(['export' => true]);
        $company = (string) tenant('name');
        $binary = $reports->pdfBinary($reports->build($request), $company);

        try {
            Mail::to($email)->send(new OwnerReportMail($company, $binary));
        } catch (\Throwable $exception) {
            report($exception);

            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se pudo enviar el correo. Revisa la configuración de correo.',
            ]);
        }

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'El consolidado se envió a '.$email.'.',
        ]);
    }
}
