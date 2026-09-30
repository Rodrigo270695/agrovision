<?php

namespace App\Support;

use App\Models\Certificate;
use App\Models\CertificateTemplate;
use Barryvdh\DomPDF\Facade\Pdf;
use Symfony\Component\HttpFoundation\Response;

final class CertificatePdf
{
    public static function output(Certificate $certificate): string
    {
        $certificate->loadMissing('template');

        return self::binary(
            $certificate->template,
            is_array($certificate->variables) ? $certificate->variables : [],
            route('certificates.verify', $certificate->token),
        );
    }

    /**
     * @param  array<string, string>  $values
     */
    public static function binary(CertificateTemplate $template, array $values, string $verifyUrl): string
    {
        $fontDir = storage_path('fonts');

        if (! is_dir($fontDir)) {
            mkdir($fontDir, 0775, true);
        }

        $layout = $template->resolvedLayout();
        $payload = [
            'blocks' => CertificateRenderer::blocks($template, $values),
            'background' => CertificateRenderer::dataUri($template->background_path),
            'signature' => ($layout['signature']['visible'] ?? true) ? CertificateRenderer::dataUri($template->signature_path) : null,
            'logo' => ($layout['logo']['visible'] ?? true) ? CertificateRenderer::dataUri($template->logo_path) : null,
            'qr' => self::qr($layout, $verifyUrl),
            'qrBox' => $layout['qr'],
            'signatureBox' => $layout['signature'],
            'logoBox' => $layout['logo'],
        ];

        try {
            return Pdf::loadView('pdfs.certificate', $payload)->setPaper('a4', 'landscape')->output();
        } catch (\Throwable $exception) {
            report($exception);

            $payload['background'] = null;
            $payload['signature'] = null;
            $payload['logo'] = null;

            try {
                return Pdf::loadView('pdfs.certificate', $payload)->setPaper('a4', 'landscape')->output();
            } catch (\Throwable $again) {
                report($again);
                $payload['qr'] = null;

                return Pdf::loadView('pdfs.certificate', $payload)->setPaper('a4', 'landscape')->output();
            }
        }
    }

    /**
     * @param  array{qr: array<string, mixed>}  $layout
     */
    private static function qr(array $layout, string $verifyUrl): ?string
    {
        if (! ($layout['qr']['visible'] ?? true)) {
            return null;
        }

        try {
            $qr = CertificateQr::dataUri($verifyUrl);

            return $qr !== '' ? $qr : null;
        } catch (\Throwable $exception) {
            report($exception);

            return null;
        }
    }

    public static function response(Certificate $certificate): Response
    {
        return self::inline(self::output($certificate), 'certificado-'.$certificate->code.'.pdf');
    }

    public static function inline(string $binary, string $filename): Response
    {
        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$filename.'"',
        ]);
    }
}
