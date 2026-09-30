<?php

namespace App\Http\Controllers;

use App\Models\Certificate;
use App\Models\CertificateTemplate;
use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Support\CertificateFonts;
use App\Support\CertificateMailer;
use App\Support\CertificatePdf;
use App\Support\CertificateRenderer;
use App\Support\CertificateVariables;
use App\Support\InductionAttendeeStatuses;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

class CertificateTemplateController extends Controller
{
    public function index(): Response
    {
        $templates = CertificateTemplate::query()
            ->with('induction:id,title,session_date')
            ->withCount('certificates')
            ->orderByDesc('id')
            ->get()
            ->map(fn (CertificateTemplate $template) => [
                'id' => $template->id,
                'name' => $template->name,
                'issuer_name' => $template->issuer_name,
                'induction_title' => $template->induction?->title,
                'session_on' => optional($template->induction?->session_date)?->format('d/m/Y'),
                'certificates_count' => $template->certificates_count,
            ]);

        return Inertia::render('certificates/index', [
            'templates' => $templates,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('certificates/editor', $this->editorPayload(null));
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $template = CertificateTemplate::query()->create([
            ...$data,
            'layout' => $this->layout($request),
            'custom_variables' => $this->customVariables($request),
            'created_by' => Auth::id(),
        ]);

        $this->storeImages($request, $template);

        return redirect()
            ->route('inductions.certificates.edit', $template)
            ->with('toast', [
                'type' => 'success',
                'message' => 'Plantilla creada. Ya puedes acomodar los textos y emitir certificados.',
            ]);
    }

    public function edit(CertificateTemplate $template): Response
    {
        return Inertia::render('certificates/editor', $this->editorPayload($template));
    }

    public function update(Request $request, CertificateTemplate $template): RedirectResponse
    {
        $template->update([
            ...$this->validated($request),
            'layout' => $this->layout($request),
            'custom_variables' => $this->customVariables($request),
        ]);

        $this->storeImages($request, $template);

        return back()->with('toast', [
            'type' => 'success',
            'message' => 'Plantilla guardada.',
        ]);
    }

    public function destroy(CertificateTemplate $template): RedirectResponse
    {
        $template->delete();

        return redirect()
            ->route('inductions.certificates.index')
            ->with('toast', [
                'type' => 'success',
                'message' => 'Plantilla eliminada.',
            ]);
    }

    public function issue(Request $request, CertificateTemplate $template): RedirectResponse
    {
        $template->load('induction');
        $induction = $template->induction;

        if (! $induction) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'La plantilla no tiene una inducción.',
            ]);
        }

        $data = $request->validate([
            'attendee_ids' => ['required', 'array', 'min:1'],
            'attendee_ids.*' => ['integer'],
        ]);

        $attendees = InductionAttendee::query()
            ->where('induction_id', $induction->id)
            ->whereIn('id', $data['attendee_ids'])
            ->get();

        $created = CertificateMailer::issue($template, $attendees);

        return back()->with('toast', [
            'type' => $created > 0 ? 'success' : 'error',
            'message' => $created > 0
                ? "Se emitieron {$created} certificado(s)."
                : 'Esas personas ya tienen certificado de esta plantilla.',
        ]);
    }

    public function emailDrivers(CertificateTemplate $template): RedirectResponse
    {
        $result = CertificateMailer::sendToDrivers($template);

        return back()->with('toast', [
            'type' => $result['sent'] > 0 ? 'success' : 'error',
            'message' => CertificateMailer::message($result),
        ]);
    }

    public function preview(Request $request, CertificateTemplate $template): HttpResponse
    {
        $template->load('induction');
        $induction = $template->induction;
        $attendee = null;

        if ($induction) {
            $attendeeId = (int) $request->query('attendee', 0);
            $attendees = fn () => $induction->attendees()->orderBy('driver_name');

            if ($attendeeId > 0) {
                $attendee = $attendees()->whereKey($attendeeId)->first();
            }

            $attendee ??= $attendees()->where('status', InductionAttendeeStatuses::ATTENDED)->first()
                ?? $attendees()->first();
        }

        if ($attendee) {
            $existing = Certificate::query()
                ->where('certificate_template_id', $template->id)
                ->where('induction_attendee_id', $attendee->id)
                ->first();

            if ($existing) {
                return CertificatePdf::response($existing);
            }
        }

        $issuedOn = CarbonImmutable::now()->startOfDay();
        $expiresOn = $issuedOn->addMonths(max(1, (int) $template->validity_months));
        $custom = collect($template->custom_variables ?? [])
            ->mapWithKeys(fn (array $item) => [($item['key'] ?? '') => (string) ($item['value'] ?? '')])
            ->filter(fn ($value, $key) => $key !== '')
            ->all();

        if ($induction && $attendee) {
            $values = CertificateRenderer::variables(
                $template,
                $induction,
                $attendee,
                $issuedOn,
                $expiresOn,
                'VISTA-PREVIA',
                $custom,
            );
        } else {
            $values = $this->sample($template);
            $values['codigo'] = 'VISTA-PREVIA';
        }

        $binary = CertificatePdf::binary($template, $values, 'Vista previa. El código de verificación se asigna al enviar el certificado.');

        return CertificatePdf::inline($binary, 'vista-previa-certificado.pdf');
    }

    public function pdf(Certificate $certificate): HttpResponse
    {
        return CertificatePdf::response($certificate);
    }

    public function verify(string $token): HttpResponse
    {
        $certificate = Certificate::query()->where('token', $token)->first();

        if (! $certificate) {
            return response()->view('certificates.verify', [
                'found' => false,
            ], 404);
        }

        return response()->view('certificates.verify', [
            'found' => true,
            'certificate' => $certificate,
            'expired' => $certificate->isExpired(),
        ]);
    }

    public function verifyPdf(string $token): HttpResponse
    {
        $certificate = Certificate::query()->where('token', $token)->firstOrFail();

        return CertificatePdf::response($certificate);
    }

    /**
     * @return array<string, mixed>
     */
    private function editorPayload(?CertificateTemplate $template): array
    {
        $template?->load([
            'induction:id,title,session_date,temario,sede,location,estimated_minutes,start_time,end_time,scheduled_at',
            'certificates',
        ]);

        $inductions = Induction::query()
            ->orderByDesc('session_date')
            ->orderByDesc('id')
            ->limit(200)
            ->get(['id', 'title', 'session_date'])
            ->map(fn (Induction $induction) => [
                'id' => $induction->id,
                'title' => $induction->title,
                'session_on' => optional($induction->session_date)?->format('d/m/Y'),
            ]);

        $issued = [];
        $attendees = [];

        if ($template?->induction) {
            $byAttendee = $template->certificates->keyBy('induction_attendee_id');
            $attendees = $template->induction->attendees()
                ->with('unit:id,email')
                ->orderBy('driver_name')
                ->get()
                ->map(function (InductionAttendee $attendee) use ($byAttendee) {
                    $certificate = $byAttendee->get($attendee->id);

                    return [
                        'id' => $attendee->id,
                        'name' => $attendee->driver_name,
                        'dni' => $attendee->driver_dni,
                        'email' => $attendee->unit?->email,
                        'status' => $attendee->status,
                        'status_label' => InductionAttendeeStatuses::label($attendee->status),
                        'certificate_id' => $certificate?->id,
                        'code' => $certificate?->code,
                    ];
                })
                ->values();

            $issued = $template->certificates
                ->sortBy('participant_name')
                ->map(fn (Certificate $certificate) => [
                    'id' => $certificate->id,
                    'code' => $certificate->code,
                    'name' => $certificate->participant_name,
                    'dni' => $certificate->participant_dni,
                    'issued_on' => $certificate->issued_on?->format('d/m/Y'),
                    'expires_on' => $certificate->expires_on?->format('d/m/Y'),
                    'verify_url' => route('certificates.verify', $certificate->token),
                ])
                ->values();
        }

        $layout = $template?->resolvedLayout() ?? CertificateVariables::defaultLayout();

        return [
            'template' => $template ? [
                'id' => $template->id,
                'induction_id' => $template->induction_id,
                'name' => $template->name,
                'issuer_name' => $template->issuer_name,
                'issuer_title' => $template->issuer_title,
                'validity_months' => $template->validity_months,
                'background_url' => $template->backgroundUrl(),
                'signature_url' => $template->signatureUrl(),
                'logo_url' => $template->logoUrl(),
            ] : null,
            'layout' => $layout,
            'custom_variables' => array_values($template?->custom_variables ?? []),
            'variables' => CertificateVariables::forFrontend(),
            'inductions' => $inductions,
            'attendees' => $attendees,
            'issued' => $issued,
            'sample' => $this->sample($template),
            'fonts' => CertificateFonts::forFrontend(),
        ];
    }

    /**
     * @return array<string, string>
     */
    private function sample(?CertificateTemplate $template): array
    {
        $induction = $template?->induction;
        $attendee = $induction?->attendees()->orderBy('id')->first();
        $issued = CarbonImmutable::now()->startOfDay();
        $months = max(1, (int) ($template->validity_months ?? 12));

        if (! $induction || ! $attendee || ! $template) {
            return [
                'nombre' => 'MEDINA PALMA DAYVE JHONSON',
                'dni' => '45652349',
                'curso' => 'TRABAJOS EN ALTURA',
                'temario' => 'Trabajos en altura',
                'fecha' => CertificateRenderer::longDate($issued),
                'horas' => '08',
                'emision' => $issued->format('d/m/Y'),
                'vencimiento' => $issued->addMonths($months)->format('d/m/Y'),
                'codigo' => 'CODA-'.$issued->year.'-0000',
                'firmante' => $template?->issuer_name ?: 'Nombre del firmante',
                'cargo' => $template?->issuer_title ?: 'Cargo',
                'sede' => 'Sede',
                'empresa' => 'Empresa',
            ];
        }

        return CertificateRenderer::variables(
            $template,
            $induction,
            $attendee,
            $issued,
            $issued->addMonths($months),
            'CODA-'.$issued->year.'-0000',
            collect($template->custom_variables ?? [])
                ->mapWithKeys(fn (array $item) => [($item['key'] ?? '') => (string) ($item['value'] ?? '')])
                ->all(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request): array
    {
        $data = $request->validate([
            'induction_id' => ['required', 'integer', 'exists:inductions,id'],
            'name' => ['required', 'string', 'max:160'],
            'issuer_name' => ['required', 'string', 'max:160'],
            'issuer_title' => ['nullable', 'string', 'max:160'],
            'validity_months' => ['required', 'integer', 'min:1', 'max:120'],
            'background' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:8192'],
            'signature' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
            'logo' => ['nullable', 'image', 'mimes:jpeg,jpg,png,webp', 'max:4096'],
        ], [
            'induction_id.required' => 'Elige la inducción de esta plantilla.',
            'name.required' => 'Ponle un nombre a la plantilla.',
            'issuer_name.required' => 'Escribe el nombre de quien firma el certificado.',
        ]);

        unset($data['background'], $data['signature'], $data['logo']);

        return $data;
    }

    /**
     * @return array{blocks: list<array<string, mixed>>, qr: array<string, float>, signature: array<string, float>, logo: array<string, float>}
     */
    private function layout(Request $request): array
    {
        $decoded = json_decode((string) $request->input('layout'), true);
        $defaults = CertificateVariables::defaultLayout();

        if (! is_array($decoded)) {
            return $defaults;
        }

        $blocks = [];

        foreach ($decoded['blocks'] ?? [] as $block) {
            if (! is_array($block)) {
                continue;
            }

            $text = trim((string) ($block['text'] ?? ''));

            if ($text === '') {
                continue;
            }

            $blocks[] = [
                'id' => Str::limit(preg_replace('/[^a-z0-9_-]/i', '', (string) ($block['id'] ?? Str::random(8))) ?: Str::random(8), 40, ''),
                'text' => Str::limit($text, 500, ''),
                'x' => CertificateRenderer::percent($block['x'] ?? 8),
                'y' => CertificateRenderer::percent($block['y'] ?? 8),
                'w' => max(8, CertificateRenderer::percent($block['w'] ?? 40)),
                'size' => max(8, min(96, (int) ($block['size'] ?? 12))),
                'align' => in_array($block['align'] ?? '', ['left', 'center', 'right'], true) ? $block['align'] : 'left',
                'weight' => ($block['weight'] ?? '') === 'bold' ? 'bold' : 'normal',
                'font' => CertificateFonts::id((string) ($block['font'] ?? 'sans')),
                'color' => CertificateRenderer::color((string) ($block['color'] ?? '#1a1a1a')),
            ];
        }

        $qr = is_array($decoded['qr'] ?? null) ? $decoded['qr'] : [];
        $signature = is_array($decoded['signature'] ?? null) ? $decoded['signature'] : [];
        $logo = is_array($decoded['logo'] ?? null) ? $decoded['logo'] : [];

        return [
            'blocks' => $blocks === [] ? $defaults['blocks'] : $blocks,
            'qr' => [
                'x' => CertificateRenderer::percent($qr['x'] ?? $defaults['qr']['x']),
                'y' => CertificateRenderer::percent($qr['y'] ?? $defaults['qr']['y']),
                'size' => max(6, min(40, (float) ($qr['size'] ?? $defaults['qr']['size']))),
            ],
            'signature' => [
                'x' => CertificateRenderer::percent($signature['x'] ?? $defaults['signature']['x']),
                'y' => CertificateRenderer::percent($signature['y'] ?? $defaults['signature']['y']),
                'w' => max(8, min(70, (float) ($signature['w'] ?? $defaults['signature']['w']))),
                'h' => max(4, min(45, (float) ($signature['h'] ?? $defaults['signature']['h']))),
            ],
            'logo' => [
                'x' => CertificateRenderer::percent($logo['x'] ?? $defaults['logo']['x']),
                'y' => CertificateRenderer::percent($logo['y'] ?? $defaults['logo']['y']),
                'w' => max(6, min(50, (float) ($logo['w'] ?? $defaults['logo']['w']))),
                'h' => max(4, min(45, (float) ($logo['h'] ?? $defaults['logo']['h']))),
            ],
        ];
    }

    /**
     * @return list<array{key: string, label: string, value: string}>
     */
    private function customVariables(Request $request): array
    {
        $decoded = json_decode((string) $request->input('custom_variables'), true);

        if (! is_array($decoded)) {
            return [];
        }

        $reserved = array_keys(CertificateVariables::builtIn());
        $items = [];

        foreach ($decoded as $item) {
            if (! is_array($item)) {
                continue;
            }

            $key = strtolower(trim((string) ($item['key'] ?? '')));

            if (! preg_match('/^[a-z][a-z0-9_]{0,30}$/', $key) || in_array($key, $reserved, true)) {
                continue;
            }

            $items[$key] = [
                'key' => $key,
                'label' => Str::limit(trim((string) ($item['label'] ?? $key)), 80, ''),
                'value' => Str::limit(trim((string) ($item['value'] ?? '')), 200, ''),
            ];
        }

        return array_values($items);
    }

    private function storeImages(Request $request, CertificateTemplate $template): void
    {
        $disk = Storage::disk('public');

        if ($request->hasFile('background')) {
            if ($template->background_path) {
                $disk->delete($template->background_path);
            }

            $template->background_path = $request->file('background')->store('certificates/backgrounds', 'public');
        }

        if ($request->hasFile('signature')) {
            if ($template->signature_path) {
                $disk->delete($template->signature_path);
            }

            $template->signature_path = $request->file('signature')->store('certificates/signatures', 'public');
        }

        if ($request->hasFile('logo')) {
            if ($template->logo_path) {
                $disk->delete($template->logo_path);
            }

            $template->logo_path = $request->file('logo')->store('certificates/logos', 'public');
        }

        $template->save();
    }
}
