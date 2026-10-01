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

        if (! filled($induction->document_code)) {
            $induction->document_code = 'GH-GD-FO-0609';
        }
        if (! filled($induction->document_revision)) {
            $induction->document_revision = '006';
        }

        $toDataUri = static function (?string $absolute): ?string {
            if (! $absolute || ! is_file($absolute)) {
                return null;
            }

            $mime = mime_content_type($absolute) ?: 'image/png';
            $binary = file_get_contents($absolute);

            if ($binary === false) {
                return null;
            }

            return 'data:'.$mime.';base64,'.base64_encode($binary);
        };

        $logoSrc = PdfLogo::dataUri();

        $speakerSignatureSrc = $induction->speaker_signature_path
            ? $toDataUri(Storage::disk('public')->path($induction->speaker_signature_path))
            : null;

        $verificationPhotoSrc = $induction->verification_photo_path
            ? $toDataUri(Storage::disk('public')->path($induction->verification_photo_path))
            : null;

        $attendedSigned = $induction->attendees
            ->filter(fn (InductionAttendee $attendee) => $attendee->status === InductionAttendeeStatuses::ATTENDED
                && $attendee->isSigned())
            ->sortBy(fn (InductionAttendee $attendee) => mb_strtoupper(trim($attendee->driver_name)), SORT_NATURAL)
            ->values();

        $attendanceRows = $attendedSigned->map(function (InductionAttendee $attendee, int $index) use ($toDataUri, $induction) {
            $signatureAbsolute = $attendee->signature_path
                ? Storage::disk('public')->path($attendee->signature_path)
                : null;
            $fingerprintAbsolute = $attendee->fingerprint_path
                ? Storage::disk('public')->path($attendee->fingerprint_path)
                : null;

            $area = trim((string) ($induction->area ?? ''));
            $cargo = 'CONDUCTOR';

            return [
                'n' => $index + 1,
                'dni' => $attendee->driver_dni,
                'area_cargo' => trim(($area !== '' ? $area.' / ' : '').$cargo),
                'name' => $attendee->driver_name,
                'signature_src' => $toDataUri($signatureAbsolute),
                'fingerprint_src' => $toDataUri($fingerprintAbsolute),
                'attendee' => $attendee,
            ];
        });

        $reportPdf = Pdf::loadView('pdfs.induction-sst-report', [
            'induction' => $induction,
            'logoSrc' => $logoSrc,
            'attendeesCount' => $attendedSigned->count(),
        ])->setPaper('a4', 'portrait');

        $registerPdf = Pdf::loadView('pdfs.induction-register', [
            'induction' => $induction,
            'attendees' => $attendanceRows,
            'logoSrc' => $logoSrc,
            'speakerSignatureSrc' => $speakerSignatureSrc,
            'verificationPhotoSrc' => $verificationPhotoSrc,
            'activityLabels' => InductionFormOptions::activities(),
            'modalityLabels' => InductionFormOptions::modalities(),
            'schoolLabels' => InductionFormOptions::schools(),
            'categoryLabels' => InductionFormOptions::categories(),
        ])->setPaper('a4', 'landscape');

        $documents = [
            $reportPdf->output(),
            $registerPdf->output(),
        ];

        foreach ($attendanceRows as $row) {
            /** @var InductionAttendee $attendee */
            $attendee = $row['attendee'];

            $documents[] = Pdf::loadView('pdfs.induction-risst-receipt', [
                'induction' => $induction,
                'attendee' => $attendee,
                'logoSrc' => $logoSrc,
                'signatureSrc' => $row['signature_src'],
                'fingerprintSrc' => $row['fingerprint_src'],
            ])->setPaper('a4', 'portrait')->output();
        }

        $acta = $induction->acta_number ?: str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT);
        $filename = 'induccion_'.$acta.'.pdf';

        return response(self::merge($documents), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
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
