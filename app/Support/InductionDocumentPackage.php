<?php

namespace App\Support;

use App\Models\Induction;
use App\Models\InductionAttendee;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use setasign\Fpdi\Fpdi;
use setasign\Fpdi\PdfParser\StreamReader;

final class InductionDocumentPackage
{
    public static function download(Induction $induction): Response
    {
        $induction->load([
            'attendees' => fn ($q) => $q->orderBy('driver_name'),
            'period',
        ]);

        $disk = Storage::disk('local');
        $pdfPath = 'inductions/packages/'.$induction->id.'.pdf';
        $stampPath = 'inductions/packages/'.$induction->id.'.stamp';
        $stamp = self::stamp($induction);
        $cached = $disk->get($pdfPath);

        if (is_string($cached) && $cached !== '' && $disk->get($stampPath) === $stamp) {
            return self::pdfResponse($cached, $induction);
        }

        @set_time_limit(300);
        @ini_set('memory_limit', '1024M');

        $binary = self::actaBinary($induction);
        $disk->put($pdfPath, $binary);
        $disk->put($stampPath, $stamp);

        return self::pdfResponse($binary, $induction);
    }

    /**
     * Informe SST + formato de registro. Si hay DNI, esas filas salen resaltadas.
     *
     * @param  list<string>  $highlightDnis
     */
    public static function actaBinary(Induction $induction, array $highlightDnis = []): string
    {
        $induction->loadMissing([
            'attendees' => fn ($q) => $q->orderBy('driver_name'),
            'period',
        ]);

        $formats = InductionDocumentSettings::forPdf($induction);
        $logoSrc = PdfLogo::dataUri();
        $rows = self::attendanceRows($induction);

        return self::merge([
            self::renderView('pdfs.induction-sst-report', [
                'induction' => $induction,
                'formats' => $formats,
                'logoSrc' => $logoSrc,
                'attendeesCount' => $induction->attendees->count(),
            ]),
            self::renderView('pdfs.induction-register', [
                'induction' => $induction,
                'formats' => $formats,
                'attendees' => $rows,
                'highlightedDnis' => $highlightDnis,
                'logoSrc' => $logoSrc,
                'speakerSignatureSrc' => self::dataUri($induction->speaker_signature_path, 320),
                'verificationPhotoSrc' => self::dataUri($induction->verification_photo_path, 480),
                'activityLabels' => InductionFormOptions::activities(),
                'modalityLabels' => InductionFormOptions::modalities(),
                'schoolLabels' => InductionFormOptions::schools(),
                'categoryLabels' => InductionFormOptions::categories(),
            ]),
        ]);
    }

    /**
     * @param  list<InductionAttendee>|\Illuminate\Support\Collection<int, InductionAttendee>  $attendees
     */
    public static function receiptBinary(Induction $induction, string $kind, iterable $attendees): string
    {
        $induction->loadMissing(['attendees', 'period']);
        $rows = collect();
        $index = 0;

        foreach ($attendees as $attendee) {
            $rows->push(self::rowFromAttendee($induction, $attendee, ++$index));
        }

        if ($rows->isEmpty()) {
            throw new \RuntimeException('No hay asistentes para el comprobante.');
        }

        $view = $kind === 'ritran'
            ? 'pdfs.induction-ritran-receipt'
            : 'pdfs.induction-risst-receipt';

        return self::renderView($view, [
            'induction' => $induction,
            'formats' => InductionDocumentSettings::forPdf($induction),
            'logoSrc' => PdfLogo::dataUri(),
            'rows' => $rows->values(),
        ]);
    }

    /**
     * @param  list<string>  $documents
     */
    public static function mergePdfs(array $documents): string
    {
        return self::merge($documents);
    }

    public static function pdfInline(string $binary, string $filename, bool $download = false): Response
    {
        $disposition = $download ? 'attachment' : 'inline';

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => $disposition.'; filename="'.$filename.'"',
        ]);
    }

    public static function digits(?string $value): string
    {
        return preg_replace('/\D+/', '', (string) $value) ?: '';
    }

    /**
     * @return \Illuminate\Support\Collection<int, array<string, mixed>>
     */
    private static function attendanceRows(Induction $induction): \Illuminate\Support\Collection
    {
        $attendedSigned = $induction->attendees
            ->filter(fn (InductionAttendee $attendee) => $attendee->status === InductionAttendeeStatuses::ATTENDED
                && $attendee->isSigned())
            ->sortBy(fn (InductionAttendee $attendee) => mb_strtoupper(trim((string) $attendee->driver_name)), SORT_NATURAL)
            ->values();

        return $attendedSigned->map(
            fn (InductionAttendee $attendee, int $index) => self::rowFromAttendee($induction, $attendee, $index + 1),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function rowFromAttendee(Induction $induction, InductionAttendee $attendee, int $index): array
    {
        $area = trim((string) ($induction->area ?? ''));

        return [
            'n' => $index,
            'dni' => $attendee->driver_dni,
            'area_cargo' => trim(($area !== '' ? $area.' / ' : '').'CONDUCTOR'),
            'name' => $attendee->driver_name,
            'signature_src' => self::dataUri($attendee->signature_path, 280),
            'fingerprint_src' => self::dataUri($attendee->fingerprint_path, 160),
            'attendee' => $attendee,
        ];
    }

    private static function stamp(Induction $induction): string
    {
        $formats = InductionDocumentSettings::forPdf($induction);
        $parts = [
            (string) $induction->updated_at,
            (string) $induction->speaker_signature_path,
            (string) $induction->verification_photo_path,
            (string) $induction->attendees->count(),
            implode('|', $formats),
        ];

        foreach ($induction->attendees as $attendee) {
            $parts[] = implode('|', [
                $attendee->id,
                (string) $attendee->updated_at,
                (string) $attendee->status,
                (string) $attendee->signature_path,
                (string) $attendee->fingerprint_path,
                (string) $attendee->driver_name,
                (string) $attendee->provider,
            ]);
        }

        $parts[] = 'acta-formato-v1';

        return hash('sha256', implode("\n", $parts));
    }

    private static function pdfResponse(string $binary, Induction $induction): Response
    {
        $acta = $induction->acta_number ?: str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT);

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="induccion_'.$acta.'.pdf"',
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private static function renderView(string $view, array $data): string
    {
        try {
            $binary = Pdf::loadView($view, $data)
                ->setPaper('a4', 'portrait')
                ->output();
        } catch (\Throwable $e) {
            throw new \RuntimeException('Falló '.$view.': '.$e->getMessage(), 0, $e);
        }

        if (! is_string($binary) || $binary === '') {
            throw new \RuntimeException('Falló '.$view.': el PDF salió vacío.');
        }

        return $binary;
    }

    private static function dataUri(?string $path, int $maxWidth = 280): ?string
    {
        $absolute = self::publicFile($path);

        if ($absolute === null) {
            return null;
        }

        $binary = @file_get_contents($absolute);

        if ($binary === false || $binary === '') {
            return null;
        }

        if (function_exists('imagecreatefromstring')) {
            $image = @imagecreatefromstring($binary);

            if ($image !== false) {
                $width = imagesx($image);
                $height = imagesy($image);

                if ($width > $maxWidth && $width > 0) {
                    $nextHeight = max(1, (int) round($height * ($maxWidth / $width)));
                    $resized = imagecreatetruecolor($maxWidth, $nextHeight);
                    imagealphablending($resized, false);
                    imagesavealpha($resized, true);
                    imagecopyresampled(
                        $resized,
                        $image,
                        0,
                        0,
                        0,
                        0,
                        $maxWidth,
                        $nextHeight,
                        $width,
                        $height,
                    );
                    imagedestroy($image);
                    $image = $resized;
                }

                ob_start();
                imagepng($image, null, 6);
                $binary = (string) ob_get_clean();
                imagedestroy($image);
                unset($image);

                return 'data:image/png;base64,'.base64_encode($binary);
            }
        }

        $mime = mime_content_type($absolute) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode($binary);
    }

    private static function publicFile(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        $path = ltrim(str_replace('\\', '/', (string) strtok($path, '?')), '/');

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, strlen('storage/'));
        }

        $tenantId = (string) tenant('id');
        $prefix = 'tenants/'.$tenantId.'/';

        if ($tenantId !== '' && str_starts_with($path, $prefix)) {
            $path = substr($path, strlen($prefix));
        }

        if ($path === '' || str_contains($path, '..')) {
            return null;
        }

        $candidates = [
            Storage::disk('public')->path($path),
            storage_path('app/public/tenants/'.$tenantId.'/'.$path),
            storage_path('app/public/'.$path),
        ];

        foreach ($candidates as $absolute) {
            if (is_file($absolute)) {
                return $absolute;
            }
        }

        return null;
    }

    /**
     * @param  list<string>  $documents
     */
    private static function merge(array $documents): string
    {
        $pdf = new Fpdi;
        $pdf->SetMargins(0, 0, 0);
        $pdf->SetAutoPageBreak(false);

        foreach ($documents as $binary) {
            $pageCount = $pdf->setSourceFile(StreamReader::createByString($binary));

            for ($page = 1; $page <= $pageCount; $page++) {
                $template = $pdf->importPage($page);
                $size = $pdf->getTemplateSize($template);

                if (! is_array($size)) {
                    throw new \RuntimeException('No se pudo leer una página del documento.');
                }

                $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
                $pdf->useTemplate($template, 0, 0, $size['width'], $size['height'], true);
            }
        }

        $merged = $pdf->Output('S');

        if (! is_string($merged) || $merged === '') {
            throw new \RuntimeException('No se pudo unir el documento.');
        }

        return $merged;
    }
}
