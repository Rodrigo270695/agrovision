<?php

namespace App\Support;

use App\Models\CentralCertificate;
use App\Models\CentralCertificateTemplate;
use App\Models\CentralParticipant;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Storage;

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
            'inicio' => $issuedOn->format('d/m/Y'),
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
            $placed = self::placed(
                $stored['path'] ?? null,
                is_array($box) ? (float) $box['x'] : 4,
                is_array($box) ? (float) $box['y'] : 4,
                is_array($box) ? (float) $box['w'] : 16,
                is_array($box) ? (float) $box['h'] : 12,
            );

            if ($placed !== null) {
                $logos[] = $placed;
            }
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
                ? self::placed(
                    $template->watermark_path,
                    (float) $layout['watermark']['x'],
                    (float) $layout['watermark']['y'],
                    (float) $layout['watermark']['w'],
                    (float) $layout['watermark']['h'],
                )
                : null,
            'signature' => ($layout['signature']['visible'] ?? true)
                ? self::placed(
                    $template->signature_path,
                    (float) $layout['signature']['x'],
                    (float) $layout['signature']['y'],
                    (float) $layout['signature']['w'],
                    (float) $layout['signature']['h'],
                )
                : null,
            'stamp' => ($layout['stamp']['visible'] ?? true)
                ? self::placed(
                    $template->stamp_path,
                    (float) $layout['stamp']['x'],
                    (float) $layout['stamp']['y'],
                    (float) $layout['stamp']['w'],
                    (float) $layout['stamp']['h'],
                )
                : null,
            'logos' => $logos,
            'qr' => $qr,
            'qrBox' => $layout['qr'],
        ])->setPaper('a4', 'landscape');

        $pdf->setOption('fontDir', $fontDir);
        $pdf->setOption('fontCache', $fontDir);

        return $pdf->output();
    }

    /**
     * Encaja la imagen dentro del recuadro, igual que object-contain en la pantalla.
     *
     * @return array{src: string, left: float, top: float, width: float, height: float}|null
     */
    private static function placed(?string $path, float $xPct, float $yPct, float $wPct, float $hPct): ?array
    {
        $src = CertificateRenderer::dataUri($path);

        if ($src === null || $path === null) {
            return null;
        }

        $boxW = max(1, ($wPct / 100) * 297);
        $boxH = max(1, ($hPct / 100) * 210);
        $left = ($xPct / 100) * 297;
        $top = ($yPct / 100) * 210;
        $absolute = Storage::disk('public')->path($path);
        $info = @getimagesize($absolute);
        $pxW = (int) ($info[0] ?? 0);
        $pxH = (int) ($info[1] ?? 0);

        if ($pxW > 0 && $pxH > 0 && function_exists('imagecreatefromstring')) {
            $binary = @file_get_contents($absolute);
            $image = $binary !== false ? @imagecreatefromstring($binary) : false;

            if ($image !== false) {
                $dpi = 8;
                $canvasW = max(1, (int) round($boxW * $dpi));
                $canvasH = max(1, (int) round($boxH * $dpi));
                $scale = min($canvasW / $pxW, $canvasH / $pxH);
                $drawW = max(1, (int) round($pxW * $scale));
                $drawH = max(1, (int) round($pxH * $scale));
                $canvas = imagecreatetruecolor($canvasW, $canvasH);
                imagealphablending($canvas, false);
                imagesavealpha($canvas, true);
                $clear = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
                imagefilledrectangle($canvas, 0, 0, $canvasW, $canvasH, $clear);
                imagealphablending($canvas, true);
                imagecopyresampled(
                    $canvas,
                    $image,
                    (int) round(($canvasW - $drawW) / 2),
                    (int) round(($canvasH - $drawH) / 2),
                    0,
                    0,
                    $drawW,
                    $drawH,
                    $pxW,
                    $pxH,
                );
                imagedestroy($image);
                imagealphablending($canvas, false);
                imagesavealpha($canvas, true);
                ob_start();
                imagepng($canvas);
                $png = ob_get_clean();
                imagedestroy($canvas);

                if (is_string($png) && $png !== '') {
                    $src = 'data:image/png;base64,'.base64_encode($png);
                }
            }
        }

        return [
            'src' => $src,
            'left' => round($left, 2),
            'top' => round($top, 2),
            'width' => round($boxW, 2),
            'height' => round($boxH, 2),
        ];
    }
}
