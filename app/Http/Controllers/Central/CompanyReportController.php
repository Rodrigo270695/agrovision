<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Mail\OwnerReportMail;
use App\Models\Tenant;
use App\Support\OwnerReports;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class CompanyReportController extends Controller
{
    public function show(Request $request, Tenant $tenant, OwnerReports $reports): Response
    {
        $payload = $tenant->run(fn () => $reports->build($request));

        return Inertia::render('company-reports/index', [
            'company' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
            ],
            'baseUrl' => '/plataforma/empresas/'.$tenant->id.'/reportes',
            ...$payload,
        ]);
    }

    public function updateQuotas(Request $request, Tenant $tenant, OwnerReports $reports): RedirectResponse
    {
        $validated = $this->validatedQuotas($request);

        $tenant->run(fn () => $reports->saveQuotas($validated['quotas']));

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Cuotas de inspectores guardadas.',
        ]);
    }

    public function pdf(Request $request, Tenant $tenant, OwnerReports $reports): HttpResponse
    {
        $binary = $tenant->run(function () use ($request, $reports, $tenant) {
            $data = $reports->build($request);

            return $reports->pdfBinary($data, $tenant->name);
        });

        $name = 'reportes-'.$tenant->id.'.pdf';

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.$name.'"',
        ]);
    }

    public function mail(Request $request, Tenant $tenant, OwnerReports $reports): RedirectResponse
    {
        $email = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ], [
            'email.required' => 'Escribe el correo de destino.',
            'email.email' => 'El correo no es válido.',
        ])['email'];

        $binary = $tenant->run(function () use ($request, $reports, $tenant) {
            $data = $reports->build($request);

            return $reports->pdfBinary($data, $tenant->name);
        });

        try {
            Mail::to($email)->send(new OwnerReportMail($tenant->name, $binary));
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

    /**
     * @return array{quotas: list<array{user_id: int, daily_quota: int|null}>}
     */
    private function validatedQuotas(Request $request): array
    {
        /** @var array{quotas: list<array{user_id: int, daily_quota: int|null}>} $validated */
        $validated = $request->validate([
            'quotas' => ['required', 'array'],
            'quotas.*.user_id' => ['required', 'integer'],
            'quotas.*.daily_quota' => ['nullable', 'integer', 'min:1', 'max:500'],
        ], [
            'quotas.*.daily_quota.min' => 'La cuota mínima es 1 inspección por día.',
            'quotas.*.daily_quota.max' => 'La cuota no puede pasar de 500.',
        ]);

        return $validated;
    }
}
