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
        $layout = $template->resolvedLayout();

        return Pdf::loadView('pdfs.certificate', [
            'blocks' => CertificateRenderer::blocks($template, $values),
            'background' => CertificateRenderer::dataUri($template->background_path),
            'signature' => CertificateRenderer::dataUri($template->signature_path),
            'qr' => CertificateQr::dataUri($verifyUrl),
            'qrBox' => $layout['qr'],
            'signatureBox' => $layout['signature'],
            'logoSrc' => PdfLogo::dataUri(),
        ])->setPaper('a4', 'landscape')->output();
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
