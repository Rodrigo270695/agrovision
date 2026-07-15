<?php

namespace App\Support;

use App\Models\Induction;
use App\Models\InductionAttendee;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use ZipArchive;

final class InductionDocumentPackage
{
    public static function download(Induction $induction): BinaryFileResponse
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

        $acta = $induction->acta_number ?: str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT);
        $zipPath = storage_path('app/tmp/induccion_'.$acta.'_'.Str::random(8).'.zip');
        $zipDir = dirname($zipPath);

        if (! is_dir($zipDir)) {
            mkdir($zipDir, 0775, true);
        }

        $zip = new ZipArchive;

        if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('No se pudo crear el archivo ZIP.');
        }

        $zip->addFromString(
            '00_informe_sst_'.$acta.'.pdf',
            $reportPdf->output()
        );

        $zip->addFromString(
            '01_registro_induccion_'.$acta.'.pdf',
            $registerPdf->output()
        );

        foreach ($attendanceRows as $index => $row) {
            /** @var InductionAttendee $attendee */
            $attendee = $row['attendee'];

            $comprobante = Pdf::loadView('pdfs.induction-risst-receipt', [
                'induction' => $induction,
                'attendee' => $attendee,
                'logoSrc' => $logoSrc,
                'signatureSrc' => $row['signature_src'],
                'fingerprintSrc' => $row['fingerprint_src'],
            ])->setPaper('a4', 'portrait');

            $safeName = Str::slug($attendee->driver_name ?: 'conductor', '_');
            $safeDni = preg_replace('/\D+/', '', (string) $attendee->driver_dni) ?: 'sindni';
            $fileIndex = str_pad((string) ($index + 2), 2, '0', STR_PAD_LEFT);

            $zip->addFromString(
                $fileIndex.'_comprobante_'.$safeDni.'_'.$safeName.'.pdf',
                $comprobante->output()
            );
        }

        $zip->close();

        return response()
            ->download($zipPath, 'induccion_'.$acta.'_documentos.zip', [
                'Content-Type' => 'application/zip',
            ])
            ->deleteFileAfterSend(true);
    }
}
