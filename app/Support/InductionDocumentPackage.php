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
    /** @var array<string, string|null> */
    private static array $uriCache = [];

    /** @var array<int, array<string, mixed>> */
    private static array $context = [];

    /** @var array<string, list<string>> */
    private static array $actaCache = [];

    public static function resetCaches(): void
    {
        self::$uriCache = [];
        self::$context = [];
        self::$actaCache = [];
    }

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

        $binary = self::consolidadoBinary($induction);
        self::resetCaches();
        $disk->put($pdfPath, $binary);
        $disk->put($stampPath, $stamp);

        return self::pdfResponse($binary, $induction);
    }

    public static function allowsReceipts(Induction $induction): bool
    {
        return (string) $induction->activity === 'induccion';
    }

    /**
     * @param  list<string>  $include
     * @return list<string>
     */
    public static function filterInclude(Induction $induction, array $include): array
    {
        $include = array_values(array_intersect($include, ['acta', 'risst', 'ritran']));

        if (self::allowsReceipts($induction)) {
            return $include;
        }

        return array_values(array_filter($include, fn (string $kind) => $kind === 'acta'));
    }

    public static function actaBinary(Induction $induction, array $highlightDnis = []): string
    {
        return self::merge(self::actaParts($induction, $highlightDnis));
    }

    public static function consolidadoBinary(Induction $induction): string
    {
        $parts = self::actaParts($induction);

        if (self::allowsReceipts($induction)) {
            $attended = $induction->attendees
                ->filter(fn (InductionAttendee $attendee) => $attendee->status === InductionAttendeeStatuses::ATTENDED
                    && $attendee->isSigned())
                ->sortBy(fn (InductionAttendee $attendee) => mb_strtoupper(trim((string) $attendee->driver_name)), SORT_NATURAL)
                ->values();

            foreach ($attended->chunk(5) as $chunk) {
                $parts[] = self::receiptBinary($induction, 'risst', $chunk);
            }

            foreach ($attended->chunk(5) as $chunk) {
                $parts[] = self::receiptBinary($induction, 'ritran', $chunk);
            }
        }

        return self::merge($parts);
    }

    /**
     * Une en un solo PDF, en este orden: acta (informe + formato + evidencia), RISST, RITRAN.
     *
     * @param  list<string>  $include
     * @param  list<string>  $highlightDnis
     * @param  iterable<InductionAttendee>  $receiptAttendees
     */
    public static function bundleBinary(
        Induction $induction,
        array $include,
        array $highlightDnis,
        iterable $receiptAttendees = [],
    ): string {
        $include = self::filterInclude($induction, $include);
        $parts = [];

        if (in_array('acta', $include, true)) {
            array_push($parts, ...self::actaParts($induction, $highlightDnis));
        }

        $people = collect($receiptAttendees)->values();

        if ($people->isNotEmpty()) {
            if (in_array('risst', $include, true)) {
                $parts[] = self::receiptBinary($induction, 'risst', $people);
            }

            if (in_array('ritran', $include, true)) {
                $parts[] = self::receiptBinary($induction, 'ritran', $people);
            }
        }

        if ($parts === []) {
            throw new \RuntimeException('No hay documentos para unir.');
        }

        return count($parts) === 1 ? $parts[0] : self::merge($parts);
    }

    /**
     * @param  list<string>  $highlightDnis
     * @return list<string>
     */
    private static function actaParts(Induction $induction, array $highlightDnis = []): array
    {
        $dnis = array_values(array_unique(array_filter($highlightDnis)));
        sort($dnis);
        $cacheKey = $induction->id.'|'.implode(',', $dnis);

        if (isset(self::$actaCache[$cacheKey])) {
            return self::$actaCache[$cacheKey];
        }

        $ctx = self::context($induction);
        $parts = [
            self::renderView('pdfs.induction-sst-report', [
                'induction' => $induction,
                'formats' => $ctx['formats'],
                'logoSrc' => $ctx['logo'],
                'attendeesCount' => $induction->attendees->count(),
            ]),
            self::renderView('pdfs.induction-register', [
                'induction' => $induction,
                'formats' => $ctx['formats'],
                'attendees' => $ctx['rows'],
                'highlightedDnis' => $highlightDnis,
                'logoSrc' => $ctx['logo'],
                'speakerSignatureSrc' => $ctx['speaker'],
                'verificationPhotoSrc' => null,
                'activityLabels' => InductionFormOptions::activities(),
                'modalityLabels' => InductionFormOptions::modalities(),
                'schoolLabels' => InductionFormOptions::schools(),
                'categoryLabels' => InductionFormOptions::categories(),
            ]),
        ];

        if (is_string($ctx['evidence'])) {
            $parts[] = $ctx['evidence'];
        }

        return self::$actaCache[$cacheKey] = $parts;
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

        $ctx = self::context($induction);
        $view = $kind === 'ritran'
            ? 'pdfs.induction-ritran-receipt'
            : 'pdfs.induction-risst-receipt';

        return self::renderView($view, [
            'induction' => $induction,
            'formats' => $ctx['formats'],
            'logoSrc' => $ctx['logo'],
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
            fn (InductionAttendee $attendee, int $index) => self::rowFromAttendee($induction, $attendee, $index + 1, false),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private static function rowFromAttendee(
        Induction $induction,
        InductionAttendee $attendee,
        int $index,
        bool $withFingerprint = true,
    ): array {
        $area = trim((string) ($induction->area ?? ''));

        return [
            'n' => $index,
            'dni' => $attendee->driver_dni,
            'area_cargo' => trim(($area !== '' ? $area.' / ' : '').'CONDUCTOR'),
            'name' => $attendee->driver_name,
            'signature_src' => self::dataUri($attendee->signature_path, 220),
            'fingerprint_src' => $withFingerprint
                ? self::dataUri($attendee->fingerprint_path, 140)
                : null,
            'attendee' => $attendee,
        ];
    }

    /**
     * @return array{formats: array<string, mixed>, logo: ?string, rows: \Illuminate\Support\Collection, speaker: ?string, evidence: ?string}
     */
    private static function context(Induction $induction): array
    {
        $id = (int) $induction->id;

        if (isset(self::$context[$id])) {
            return self::$context[$id];
        }

        $induction->loadMissing([
            'attendees' => fn ($q) => $q->orderBy('driver_name'),
            'period',
        ]);

        self::$context[$id] = [
            'formats' => InductionDocumentSettings::forPdf($induction),
            'logo' => PdfLogo::dataUri(),
            'rows' => self::attendanceRows($induction),
            'speaker' => self::dataUri($induction->speaker_signature_path, 280),
            'evidence' => self::evidenceBinary($induction),
        ];

        return self::$context[$id];
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

        $parts[] = 'acta-formato-evidencia-v1';
        $parts[] = self::allowsReceipts($induction) ? 'receipts-induccion' : 'sin-receipts';

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
                ->setOption('dpi', 96)
                ->setOption('isRemoteEnabled', false)
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
        $key = (string) $path.'@'.$maxWidth;

        if (array_key_exists($key, self::$uriCache)) {
            return self::$uriCache[$key];
        }

        $absolute = self::publicFile($path);

        if ($absolute === null) {
            return self::$uriCache[$key] = null;
        }

        $jpeg = self::jpegBytes($absolute, $maxWidth, 62);

        if ($jpeg !== null) {
            return self::$uriCache[$key] = 'data:image/jpeg;base64,'.base64_encode($jpeg);
        }

        $binary = @file_get_contents($absolute);

        if ($binary === false || $binary === '') {
            return self::$uriCache[$key] = null;
        }

        $mime = mime_content_type($absolute) ?: 'image/jpeg';

        return self::$uriCache[$key] = 'data:'.$mime.';base64,'.base64_encode($binary);
    }

    private static function evidenceBinary(Induction $induction): ?string
    {
        $absolute = self::publicFile($induction->verification_photo_path);

        if ($absolute === null) {
            return null;
        }

        $temp = sys_get_temp_dir().DIRECTORY_SEPARATOR.'ind-ev-'.$induction->id.'-'.bin2hex(random_bytes(3)).'.jpg';
        $jpeg = self::jpegBytes($absolute, 1400, 70);

        if ($jpeg === null || file_put_contents($temp, $jpeg) === false) {
            return null;
        }

        try {
            $info = @getimagesize($temp);

            if (! is_array($info) || ($info[0] ?? 0) < 1) {
                return null;
            }

            $pdf = new Fpdi;
            $pdf->SetMargins(14, 14, 14);
            $pdf->SetAutoPageBreak(false);
            $pdf->AddPage('P', 'A4');
            $pdf->SetFont('Helvetica', 'B', 12);
            $pdf->Cell(0, 8, 'EVIDENCIA FOTOGRAFICA', 0, 1, 'C');
            $pdf->SetFont('Helvetica', '', 9);
            $pdf->Cell(0, 6, self::latin((string) $induction->title), 0, 1, 'C');
            $pdf->Ln(3);

            $boxW = 182.0;
            $boxH = 250.0;
            $ratio = $info[0] / max((int) $info[1], 1);
            $width = $boxW;
            $height = $width / $ratio;

            if ($height > $boxH) {
                $height = $boxH;
                $width = $height * $ratio;
            }

            $pdf->Image($temp, 14 + (($boxW - $width) / 2), $pdf->GetY(), $width, $height);
            $binary = $pdf->Output('S');

            return is_string($binary) && $binary !== '' ? $binary : null;
        } finally {
            @unlink($temp);
        }
    }

    private static function jpegBytes(string $absolute, int $maxWidth, int $quality): ?string
    {
        if (! function_exists('imagecreatefromstring')) {
            return null;
        }

        $binary = @file_get_contents($absolute);

        if ($binary === false || $binary === '') {
            return null;
        }

        $image = @imagecreatefromstring($binary);

        if ($image === false) {
            return null;
        }

        $width = imagesx($image);
        $height = imagesy($image);

        if ($width > $maxWidth && $width > 0) {
            $nextHeight = max(1, (int) round($height * ($maxWidth / $width)));
            $resized = imagecreatetruecolor($maxWidth, $nextHeight);
            $white = imagecolorallocate($resized, 255, 255, 255);
            imagefilledrectangle($resized, 0, 0, $maxWidth, $nextHeight, $white);
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
        } else {
            $canvas = imagecreatetruecolor($width, $height);
            $white = imagecolorallocate($canvas, 255, 255, 255);
            imagefilledrectangle($canvas, 0, 0, $width, $height, $white);
            imagecopy($canvas, $image, 0, 0, 0, 0, $width, $height);
            imagedestroy($image);
            $image = $canvas;
        }

        ob_start();
        imagejpeg($image, null, $quality);
        $jpeg = (string) ob_get_clean();
        imagedestroy($image);

        return $jpeg !== '' ? $jpeg : null;
    }

    private static function latin(string $value): string
    {
        $converted = @iconv('UTF-8', 'ISO-8859-1//TRANSLIT', $value);

        return is_string($converted) ? $converted : $value;
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
