<?php

namespace App\Support;

use App\Models\CentralCertificate;
use App\Models\CentralCertificateTemplate;
use App\Models\CentralParticipant;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonInterface;

final class CentralCertificateDocument
{
    /**
     * @param  array<string, string>  $custom
     * @return array<string, string>
     */
    public static function values(
        CentralCertificateTemplate $template,
        CentralParticipant $participant,
        string $code,
        CarbonInterface $issuedOn,
        ?CarbonInterface $expiresOn,
        array $custom = [],
    ): array {
        $values = [
            'nombre' => $participant->full_name,
            'dni' => $participant->dni,
            'curso' => trim((string) $template->course_title) !== '' ? (string) $template->course_title : '—',
            'emision' => $issuedOn->format('d/m/Y'),
            'vencimiento' => $expiresOn?->format('d/m/Y') ?? '—',
            'codigo' => $code,
            'firmante' => trim((string) $template->issuer_name) !== '' ? (string) $template->issuer_name : '',
            'cargo' => trim((string) $template->issuer_title) !== '' ? (string) $template->issuer_title : '',
        ];

        foreach ($custom as $key => $value) {
            $key = (string) $key;

            if ($key !== '' && preg_match('/^[a-zA-Z][a-zA-Z0-9_]*$/', $key)) {
                $values[$key] = (string) $value;
            }
        }

        return $values;
    }

    /**
     * @param  array<string, string>  $values
     */
    public static function binary(CentralCertificateTemplate $template, array $values, string $verifyUrl): string
    {
        $layout = $template->resolvedLayout();
        $fontDir = storage_path('framework/cache/dompdf');

        if (! is_dir($fontDir)) {
            @mkdir($fontDir, 0775, true);
        }

        try {
            return self::render($template, $values, $verifyUrl, $layout, $fontDir, true);
        } catch (\Throwable $exception) {
            report($exception);
        }

        return self::render($template, $values, $verifyUrl, $layout, $fontDir, false);
    }

    public static function output(CentralCertificate $certificate): string
    {
        $certificate->loadMissing('template');

        return self::binary(
            $certificate->template,
            is_array($certificate->variables) ? $certificate->variables : [],
            route('central.certificates.verify', $certificate->token),
        );
    }

    /**
     * @param  array<string, mixed>  $layout
     * @param  array<string, string>  $values
     */
    private static function render(
        CentralCertificateTemplate $template,
        array $values,
        string $verifyUrl,
        array $layout,
        string $fontDir,
        bool $embedFonts,
    ): string {
        $blocks = [];

        foreach ($layout['blocks'] as $block) {
            if (! is_array($block)) {
                continue;
            }

            $blocks[] = [
                'text' => CertificateRenderer::fill((string) ($block['text'] ?? ''), $values),
                'x' => $block['x'],
                'y' => $block['y'],
                'w' => $block['w'],
                'size' => $block['size'],
                'align' => $block['align'],
                'weight' => $block['weight'],
                'color' => $block['color'],
                'font' => $embedFonts
                    ? CertificateRenderer::fontFamily((string) ($block['font'] ?? 'sans'))
                    : 'DejaVu Sans, sans-serif',
            ];
        }

        $logos = [];

        foreach ($template->logos ?? [] as $stored) {
            if (! is_array($stored)) {
                continue;
            }

            $id = (string) ($stored['id'] ?? '');
            $box = collect($layout['logos'])->first(fn ($item) => is_array($item) && ($item['id'] ?? '') === $id);
            $uri = CertificateRenderer::dataUri($stored['path'] ?? null);

            if ($uri === null) {
                continue;
            }

            $logos[] = [
                'src' => $uri,
                'x' => is_array($box) ? $box['x'] : 4,
                'y' => is_array($box) ? $box['y'] : 4,
                'w' => is_array($box) ? $box['w'] : 16,
                'h' => is_array($box) ? $box['h'] : 12,
            ];
        }

        $qr = null;

        if ($layout['qr']['visible'] ?? true) {
            try {
                $rendered = CertificateQr::dataUri($verifyUrl);
                $qr = $rendered !== '' ? $rendered : null;
            } catch (\Throwable $exception) {
                report($exception);
            }
        }

        $pdf = Pdf::loadView('pdfs.central-certificate', [
            'embedFonts' => $embedFonts,
            'blocks' => $blocks,
            'background' => CertificateRenderer::dataUri($template->background_path),
            'watermark' => ($layout['watermark']['visible'] ?? true)
                ? CertificateRenderer::dataUri($template->watermark_path)
                : null,
            'watermarkBox' => $layout['watermark'],
            'signature' => ($layout['signature']['visible'] ?? true)
                ? CertificateRenderer::dataUri($template->signature_path)
                : null,
            'signatureBox' => $layout['signature'],
            'stamp' => ($layout['stamp']['visible'] ?? true)
                ? CertificateRenderer::dataUri($template->stamp_path)
                : null,
            'stampBox' => $layout['stamp'],
            'logos' => $logos,
            'qr' => $qr,
            'qrBox' => $layout['qr'],
        ])->setPaper('a4', 'landscape');

        $pdf->setOption('fontDir', $fontDir);
        $pdf->setOption('fontCache', $fontDir);

        return $pdf->output();
    }
}
