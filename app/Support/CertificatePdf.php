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
        $fontDir = self::fontDirectory();
        $last = null;

        try {
            return self::render($template, $values, $verifyUrl, $layout, $fontDir, true, true);
        } catch (\Throwable $exception) {
            self::remember($exception);
            $last = $exception;
        }

        try {
            return self::render($template, $values, $verifyUrl, $layout, $fontDir, false, false);
        } catch (\Throwable $exception) {
            self::remember($exception);
            $last = $exception;
        }

        throw $last ?? new \RuntimeException('No se pudo generar el certificado.');
    }

    /**
     * @param  array{blocks: list<array<string, mixed>>, qr: array<string, mixed>, signature: array<string, mixed>, logo: array<string, mixed>}  $layout
     */
    private static function render(
        CertificateTemplate $template,
        array $values,
        string $verifyUrl,
        array $layout,
        string $fontDir,
        bool $embedFonts,
        bool $withImages,
    ): string {
        $blocks = CertificateRenderer::blocks($template, $values);

        if (! $embedFonts) {
            foreach ($blocks as $index => $block) {
                $blocks[$index]['font'] = 'DejaVu Sans, sans-serif';
            }
        }

        $pdf = Pdf::loadView('pdfs.certificate', [
            'embedFonts' => $embedFonts,
            'blocks' => $blocks,
            'background' => $withImages ? CertificateRenderer::dataUri($template->background_path) : null,
            'signature' => $withImages && ($layout['signature']['visible'] ?? true) ? CertificateRenderer::dataUri($template->signature_path) : null,
            'logo' => $withImages && ($layout['logo']['visible'] ?? true) ? CertificateRenderer::dataUri($template->logo_path) : null,
            'qr' => $withImages ? self::qr($layout, $verifyUrl) : null,
            'qrBox' => $layout['qr'],
            'signatureBox' => $layout['signature'],
            'logoBox' => $layout['logo'],
        ])->setPaper('a4', 'landscape');

        $pdf->setOption('fontDir', $fontDir);
        $pdf->setOption('fontCache', $fontDir);

        return $pdf->output();
    }

    private static function fontDirectory(): string
    {
        $candidates = [
            storage_path('framework/cache/dompdf'),
            storage_path('fonts'),
        ];

        foreach ($candidates as $dir) {
            if (! is_dir($dir)) {
                @mkdir($dir, 0775, true);
            }

            if (is_dir($dir) && is_writable($dir)) {
                return $dir;
            }
        }

        return sys_get_temp_dir();
    }

    private static function remember(\Throwable $exception): void
    {
        try {
            report($exception);
        } catch (\Throwable) {
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
