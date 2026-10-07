<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\CentralCertificate;
use App\Models\CentralCertificateTemplate;
use App\Models\CentralParticipant;
use App\Models\CentralTraining;
use App\Services\ApiPeruService;
use App\Support\CentralCertificateDocument;
use App\Support\CentralCertificateLayout;
use App\Support\CertificateFonts;
use App\Support\CertificatePdf;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use ZipArchive;

class CentralCertificateController extends Controller
{
    public function participants(Request $request): Response
    {
        $trainings = CentralTraining::query()
            ->withCount('participants')
            ->orderByDesc('id')
            ->get()
            ->map(fn (CentralTraining $training) => [
                'id' => $training->id,
                'name' => $training->name,
                'participants_count' => $training->participants_count,
            ]);

        $selected = $request->integer('capacitacion') ?: $trainings->first()['id'] ?? null;
        $participants = [];

        if ($selected) {
            $participants = CentralParticipant::query()
                ->where('training_id', $selected)
                ->orderBy('full_name')
                ->get(['id', 'dni', 'full_name', 'names', 'paternal_surname', 'maternal_surname'])
                ->all();
        }

        return Inertia::render('central/certificates/participants', [
            'trainings' => $trainings,
            'selected' => $selected,
            'participants' => $participants,
        ]);
    }

    public function storeTraining(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:160'],
        ]);

        $training = CentralTraining::query()->create([
            'name' => trim($data['name']),
            'created_by' => $request->user()?->id,
        ]);

        return redirect()
            ->route('central.certificates.participants', ['capacitacion' => $training->id])
            ->with('toast', ['type' => 'success', 'message' => 'Capacitación creada.']);
    }

    public function destroyTraining(CentralTraining $training): RedirectResponse
    {
        $training->delete();

        return redirect()
            ->route('central.certificates.participants')
            ->with('toast', ['type' => 'success', 'message' => 'Capacitación eliminada.']);
    }

    public function importParticipants(Request $request, CentralTraining $training, ApiPeruService $api): RedirectResponse
    {
        $data = $request->validate([
            'dnis' => ['nullable', 'string', 'max:20000'],
            'file' => ['nullable', 'file', 'mimes:txt,csv', 'max:512'],
        ]);

        $raw = (string) ($data['dnis'] ?? '');

        if ($request->file('file') instanceof UploadedFile) {
            $raw .= "\n".$request->file('file')->get();
        }

        $dnis = collect(preg_split('/\D+/', $raw) ?: [])
            ->filter(fn ($dni) => strlen((string) $dni) === 8)
            ->unique()
            ->values();

        if ($dnis->isEmpty()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No hay DNI de 8 dígitos en el lote.',
            ]);
        }

        if ($dnis->count() > 40) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Sube como máximo 40 DNI por lote.',
            ]);
        }

        $existing = CentralParticipant::query()
            ->where('training_id', $training->id)
            ->pluck('dni')
            ->all();

        $added = 0;
        $skipped = 0;
        $failed = [];

        foreach ($dnis as $dni) {
            if (in_array($dni, $existing, true)) {
                $skipped++;

                continue;
            }

            try {
                $person = $api->lookupDni($dni);
            } catch (RuntimeException $exception) {
                $failed[] = $dni;

                continue;
            }

            CentralParticipant::query()->create([
                'training_id' => $training->id,
                'dni' => $person['dni'],
                'full_name' => $person['full_name'],
                'names' => $person['names'],
                'paternal_surname' => $person['paternal_surname'],
                'maternal_surname' => $person['maternal_surname'],
            ]);
            $existing[] = $person['dni'];
            $added++;
        }

        $message = "Se agregaron {$added} participantes.";

        if ($skipped > 0) {
            $message .= " {$skipped} ya estaban en la capacitación.";
        }

        if ($failed !== []) {
            $message .= ' No se encontró: '.implode(', ', $failed).'.';
        }

        return back()->with('toast', [
            'type' => $failed !== [] && $added === 0 ? 'error' : 'success',
            'message' => $message,
        ]);
    }

    public function destroyParticipant(CentralParticipant $participant): RedirectResponse
    {
        $participant->delete();

        return back()->with('toast', ['type' => 'success', 'message' => 'Participante eliminado.']);
    }

    public function templates(): Response
    {
        $templates = CentralCertificateTemplate::query()
            ->with('training:id,name')
            ->withCount('certificates')
            ->orderByDesc('id')
            ->get()
            ->map(fn (CentralCertificateTemplate $template) => [
                'id' => $template->id,
                'name' => $template->name,
                'course_title' => $template->course_title,
                'expires_on' => $template->expires_on?->format('d/m/Y'),
                'training' => $template->training?->name,
                'certificates_count' => $template->certificates_count,
            ]);

        return Inertia::render('central/certificates/templates', [
            'templates' => $templates,
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('central/certificates/editor', $this->editorProps(new CentralCertificateTemplate([
            'name' => 'Nueva plantilla',
            'course_title' => '',
            'code_prefix' => 'GIN',
            'layout' => CentralCertificateLayout::defaults(),
        ])));
    }

    public function edit(CentralCertificateTemplate $template): Response
    {
        return Inertia::render('central/certificates/editor', $this->editorProps($template));
    }

    public function store(Request $request): RedirectResponse
    {
        $template = new CentralCertificateTemplate([
            'created_by' => $request->user()?->id,
            'next_sequence' => 1,
            'logos' => [],
        ]);
        $this->fillTemplate($request, $template);
        $template->save();

        return redirect()
            ->route('central.certificates.templates.edit', $template)
            ->with('toast', ['type' => 'success', 'message' => 'Plantilla guardada.']);
    }

    public function update(Request $request, CentralCertificateTemplate $template): RedirectResponse
    {
        $this->fillTemplate($request, $template);
        $template->save();

        return back()->with('toast', ['type' => 'success', 'message' => 'Plantilla actualizada.']);
    }

    public function destroy(CentralCertificateTemplate $template): RedirectResponse
    {
        $this->deleteFiles($template);
        $template->delete();

        return redirect()
            ->route('central.certificates.templates')
            ->with('toast', ['type' => 'success', 'message' => 'Plantilla eliminada.']);
    }

    public function preview(Request $request, CentralCertificateTemplate $template): \Symfony\Component\HttpFoundation\Response
    {
        $participant = $this->participantFor($template, $request->integer('participante') ?: null);

        if (! $participant) {
            abort(422, 'Esta plantilla no tiene participantes.');
        }

        $certificate = $this->issue($template, $participant);

        return CertificatePdf::inline(
            CentralCertificateDocument::output($certificate),
            'certificado-'.$certificate->code.'.pdf',
        );
    }

    public function download(CentralCertificateTemplate $template): StreamedResponse|RedirectResponse
    {
        if (! $template->training_id) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Amarra la plantilla a una capacitación antes de descargar.',
            ]);
        }

        $participants = CentralParticipant::query()
            ->where('training_id', $template->training_id)
            ->orderBy('full_name')
            ->get();

        if ($participants->isEmpty()) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'Esa capacitación no tiene participantes.',
            ]);
        }

        if (! class_exists(ZipArchive::class)) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'El servidor no puede armar el archivo comprimido.',
            ]);
        }

        $path = storage_path('app/central-certificates-'.$template->id.'-'.Str::random(8).'.zip');
        $zip = new ZipArchive;

        if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            return back()->with('toast', [
                'type' => 'error',
                'message' => 'No se pudo crear el archivo.',
            ]);
        }

        foreach ($participants as $participant) {
            $certificate = $this->issue($template->fresh(), $participant);
            $zip->addFromString(
                $certificate->code.'-'.$certificate->participant_dni.'.pdf',
                CentralCertificateDocument::output($certificate),
            );
        }

        $zip->close();
        $filename = 'certificados-'.Str::slug($template->course_title ?: $template->name).'.zip';

        return response()->download($path, $filename)->deleteFileAfterSend(true);
    }

    public function verify(string $token): \Illuminate\Contracts\View\View
    {
        $certificate = CentralCertificate::query()->where('token', $token)->first();

        return view('certificates.central-verify', [
            'found' => $certificate !== null,
            'valid' => $certificate?->isValid() ?? false,
            'certificate' => $certificate,
        ]);
    }

    public function verifyPdf(string $token): \Symfony\Component\HttpFoundation\Response
    {
        $certificate = CentralCertificate::query()->where('token', $token)->firstOrFail();

        return CertificatePdf::inline(
            CentralCertificateDocument::output($certificate),
            'certificado-'.$certificate->code.'.pdf',
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function editorProps(CentralCertificateTemplate $template): array
    {
        $layout = $template->exists ? $template->resolvedLayout() : CentralCertificateLayout::defaults();
        $stored = collect($template->logos ?? [])->keyBy('id');
        $logos = [];

        foreach ($layout['logos'] as $box) {
            $file = $stored->get($box['id']);

            if (! is_array($file)) {
                continue;
            }

            $logos[] = [
                'id' => $box['id'],
                'url' => $template->fileUrl($file['path'] ?? null),
                'x' => $box['x'],
                'y' => $box['y'],
                'w' => $box['w'],
                'h' => $box['h'],
            ];
        }

        $participants = $template->training_id
            ? CentralParticipant::query()
                ->where('training_id', $template->training_id)
                ->orderBy('full_name')
                ->get(['id', 'full_name', 'dni'])
            : collect();

        return [
            'template' => [
                'id' => $template->id,
                'training_id' => $template->training_id,
                'name' => $template->name,
                'course_title' => $template->course_title,
                'expires_on' => $template->expires_on?->format('Y-m-d'),
                'code_prefix' => $template->code_prefix ?: 'GIN',
                'issuer_name' => $template->issuer_name ?? '',
                'issuer_title' => $template->issuer_title ?? '',
                'background_url' => $template->fileUrl($template->background_path),
                'signature_url' => $template->fileUrl($template->signature_path),
                'stamp_url' => $template->fileUrl($template->stamp_path),
                'watermark_url' => $template->fileUrl($template->watermark_path),
                'layout' => $layout,
                'logos' => $logos,
                'custom_variables' => $template->custom_variables ?? [],
            ],
            'trainings' => CentralTraining::query()->orderBy('name')->get(['id', 'name']),
            'participants' => $participants,
            'fonts' => CertificateFonts::forFrontend(),
            'variables' => ['nombre', 'dni', 'curso', 'emision', 'vencimiento', 'codigo', 'firmante', 'cargo'],
        ];
    }

    private function fillTemplate(Request $request, CentralCertificateTemplate $template): void
    {
        $data = $request->validate([
            'training_id' => ['nullable', 'integer', 'exists:central_trainings,id'],
            'name' => ['required', 'string', 'max:160'],
            'course_title' => ['required', 'string', 'max:200'],
            'expires_on' => ['nullable', 'date'],
            'code_prefix' => ['required', 'string', 'max:20'],
            'issuer_name' => ['nullable', 'string', 'max:160'],
            'issuer_title' => ['nullable', 'string', 'max:160'],
            'layout' => ['required', 'string'],
            'custom_variables' => ['nullable', 'string'],
            'background' => ['nullable', 'image', 'max:4096'],
            'signature' => ['nullable', 'image', 'max:4096'],
            'stamp' => ['nullable', 'image', 'max:4096'],
            'watermark' => ['nullable', 'image', 'max:4096'],
            'logo_files' => ['nullable', 'array', 'max:12'],
            'logo_files.*' => ['image', 'max:4096'],
            'new_logo_boxes' => ['nullable', 'string'],
            'remove_logos' => ['nullable', 'array'],
            'remove_logos.*' => ['string', 'max:40'],
            'remove_background' => ['nullable', 'boolean'],
            'remove_signature' => ['nullable', 'boolean'],
            'remove_stamp' => ['nullable', 'boolean'],
            'remove_watermark' => ['nullable', 'boolean'],
        ]);

        $layout = json_decode($data['layout'], true);
        $custom = json_decode((string) ($data['custom_variables'] ?? '[]'), true);

        $template->fill([
            'training_id' => $data['training_id'] ?: null,
            'name' => trim($data['name']),
            'course_title' => trim($data['course_title']),
            'expires_on' => $data['expires_on'] ?: null,
            'code_prefix' => strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $data['code_prefix']) ?: 'GIN'),
            'issuer_name' => trim((string) ($data['issuer_name'] ?? '')) ?: null,
            'issuer_title' => trim((string) ($data['issuer_title'] ?? '')) ?: null,
            'custom_variables' => is_array($custom) ? $this->customVariables($custom) : [],
        ]);

        if (! $template->exists) {
            $template->save();
        }

        $directory = 'central-certificates/'.$template->id;

        foreach (['background', 'signature', 'stamp', 'watermark'] as $kind) {
            $column = $kind.'_path';

            if ($request->boolean('remove_'.$kind)) {
                $this->deletePath($template->{$column});
                $template->{$column} = null;
            }

            $file = $request->file($kind);

            if ($file instanceof UploadedFile) {
                $this->deletePath($template->{$column});
                $template->{$column} = $file->store($directory, 'public');
            }
        }

        $removed = $data['remove_logos'] ?? [];
        $logos = collect($template->logos ?? [])
            ->filter(function ($logo) use ($removed) {
                if (! is_array($logo)) {
                    return false;
                }

                $drop = in_array((string) ($logo['id'] ?? ''), $removed, true);

                if ($drop) {
                    $this->deletePath($logo['path'] ?? null);
                }

                return ! $drop;
            })
            ->values()
            ->all();

        $newBoxes = json_decode((string) ($data['new_logo_boxes'] ?? '[]'), true);
        $newBoxes = is_array($newBoxes) ? array_values($newBoxes) : [];
        $newLogos = [];

        $uploadedLogos = $request->file('logo_files', []);
        $uploadedLogos = $uploadedLogos instanceof UploadedFile ? [$uploadedLogos] : (is_array($uploadedLogos) ? $uploadedLogos : []);

        foreach (array_values($uploadedLogos) as $index => $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }

            $id = 'l'.Str::lower(Str::random(8));
            $logos[] = [
                'id' => $id,
                'path' => $file->store($directory, 'public'),
            ];
            $box = is_array($newBoxes[$index] ?? null) ? $newBoxes[$index] : [];
            $newLogos[] = [
                'id' => $id,
                'x' => $box['x'] ?? (4 + (($index % 4) * 18)),
                'y' => $box['y'] ?? 4,
                'w' => $box['w'] ?? 16,
                'h' => $box['h'] ?? 12,
            ];
        }

        $resolved = CentralCertificateLayout::resolve(is_array($layout) ? $layout : null);
        $known = collect($logos)->pluck('id')->all();
        $resolved['logos'] = array_values(array_filter(
            $resolved['logos'],
            fn (array $box) => in_array($box['id'], $known, true),
        ));

        foreach ($newLogos as $logo) {
            $resolved['logos'][] = [
                'id' => $logo['id'],
                'x' => $logo['x'],
                'y' => $logo['y'],
                'w' => $logo['w'],
                'h' => $logo['h'],
            ];
        }

        $template->logos = array_map(fn (array $logo) => [
            'id' => $logo['id'],
            'path' => $logo['path'],
        ], $logos);
        $template->layout = $resolved;
    }

    /**
     * @param  array<int, mixed>  $custom
     * @return list<array{key: string, label: string, value: string}>
     */
    private function customVariables(array $custom): array
    {
        $clean = [];

        foreach ($custom as $item) {
            if (! is_array($item)) {
                continue;
            }

            $key = trim((string) ($item['key'] ?? ''));

            if (! preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $key)) {
                continue;
            }

            $clean[] = [
                'key' => $key,
                'label' => trim((string) ($item['label'] ?? $key)) ?: $key,
                'value' => (string) ($item['value'] ?? ''),
            ];
        }

        return $clean;
    }

    private function participantFor(CentralCertificateTemplate $template, ?int $id): ?CentralParticipant
    {
        if (! $template->training_id) {
            return null;
        }

        $query = CentralParticipant::query()->where('training_id', $template->training_id);

        if ($id) {
            return (clone $query)->whereKey($id)->first() ?? $query->orderBy('full_name')->first();
        }

        return $query->orderBy('full_name')->first();
    }

    private function issue(CentralCertificateTemplate $template, CentralParticipant $participant): CentralCertificate
    {
        return DB::transaction(function () use ($template, $participant) {
            $locked = CentralCertificateTemplate::query()->whereKey($template->id)->lockForUpdate()->firstOrFail();
            $existing = CentralCertificate::query()
                ->where('template_id', $locked->id)
                ->where('participant_id', $participant->id)
                ->first();

            $issuedOn = $existing?->issued_on ?? now();
            $expiresOn = $locked->expires_on;
            $code = $existing?->code ?? $this->nextCode($locked);
            $custom = collect($locked->custom_variables ?? [])
                ->mapWithKeys(fn (array $item) => [$item['key'] => $item['value'] ?? ''])
                ->all();

            $values = CentralCertificateDocument::values(
                $locked,
                $participant,
                $code,
                $issuedOn,
                $expiresOn,
                $custom,
            );

            if ($existing) {
                $existing->update([
                    'participant_name' => $participant->full_name,
                    'participant_dni' => $participant->dni,
                    'course_title' => $locked->course_title,
                    'expires_on' => $expiresOn,
                    'variables' => $values,
                ]);

                return $existing->fresh();
            }

            $certificate = CentralCertificate::query()->create([
                'template_id' => $locked->id,
                'participant_id' => $participant->id,
                'code' => $code,
                'token' => Str::random(48),
                'participant_name' => $participant->full_name,
                'participant_dni' => $participant->dni,
                'course_title' => $locked->course_title,
                'issued_on' => $issuedOn,
                'expires_on' => $expiresOn,
                'variables' => $values,
            ]);

            $locked->increment('next_sequence');

            return $certificate;
        });
    }

    private function nextCode(CentralCertificateTemplate $template): string
    {
        $prefix = $template->code_prefix ?: 'GIN';

        return sprintf('%s-%s-%04d', $prefix, now()->format('Y'), $template->next_sequence);
    }

    private function deleteFiles(CentralCertificateTemplate $template): void
    {
        foreach (['background_path', 'signature_path', 'stamp_path', 'watermark_path'] as $column) {
            $this->deletePath($template->{$column});
        }

        foreach ($template->logos ?? [] as $logo) {
            if (is_array($logo)) {
                $this->deletePath($logo['path'] ?? null);
            }
        }
    }

    private function deletePath(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }
}
