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
        $template = $certificate->template;
        $values = is_array($certificate->variables) ? $certificate->variables : [];
        $layout = $template->resolvedLayout();
        $verifyUrl = route('certificates.verify', $certificate->token);

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
        $binary = self::output($certificate);
        $name = 'certificado-'.$certificate->code.'.pdf';

        return response($binary, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$name.'"',
        ]);
    }
}
