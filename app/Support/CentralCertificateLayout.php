<?php

namespace App\Support;

final class CentralCertificateLayout
{
    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return [
            'blocks' => [
                self::block('titulo', 'CERTIFICADO', 8, 8, 84, 26, 'center', 'bold'),
                self::block('nombre', '{{nombre}}', 8, 28, 84, 18, 'center', 'bold'),
                self::block('dni', 'DNI {{dni}}', 8, 40, 84, 13, 'center', 'normal'),
                self::block('curso', 'Aprobó satisfactoriamente la capacitación del curso: “{{curso}}”', 8, 50, 84, 13, 'center', 'normal'),
                self::block('firmante', "{{firmante}}\n{{cargo}}", 34, 84, 32, 11, 'center', 'normal'),
                self::block('meta', "Fecha de emisión: {{emision}}\nFecha de expiración: {{vencimiento}}\n{{codigo}}", 4, 76, 30, 9, 'left', 'normal'),
            ],
            'qr' => ['x' => 84, 'y' => 74, 'size' => 12, 'visible' => true],
            'signature' => ['x' => 38, 'y' => 70, 'w' => 24, 'h' => 12, 'visible' => true],
            'stamp' => ['x' => 68, 'y' => 70, 'w' => 14, 'h' => 18, 'visible' => true],
            'watermark' => ['x' => 28, 'y' => 28, 'w' => 44, 'h' => 44, 'visible' => true],
            'logos' => [],
        ];
    }

    /**
     * @param  array<string, mixed>|null  $layout
     * @return array<string, mixed>
     */
    public static function resolve(?array $layout): array
    {
        $defaults = self::defaults();
        $layout = is_array($layout) ? $layout : [];

        return [
            'blocks' => self::blocks($layout['blocks'] ?? $defaults['blocks']),
            'qr' => self::box($layout['qr'] ?? [], $defaults['qr'], true),
            'signature' => self::box($layout['signature'] ?? [], $defaults['signature']),
            'stamp' => self::box($layout['stamp'] ?? [], $defaults['stamp']),
            'watermark' => self::box($layout['watermark'] ?? [], $defaults['watermark']),
            'logos' => self::logos($layout['logos'] ?? []),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function block(
        string $id,
        string $text,
        float $x,
        float $y,
        float $w,
        int $size,
        string $align,
        string $weight,
    ): array {
        return [
            'id' => $id,
            'text' => $text,
            'x' => $x,
            'y' => $y,
            'w' => $w,
            'size' => $size,
            'align' => $align,
            'weight' => $weight,
            'color' => '#1a1a1a',
            'font' => 'sans',
        ];
    }

    /**
     * @param  mixed  $blocks
     * @return list<array<string, mixed>>
     */
    private static function blocks(mixed $blocks): array
    {
        if (! is_array($blocks)) {
            return self::defaults()['blocks'];
        }

        $clean = [];

        foreach ($blocks as $block) {
            if (! is_array($block)) {
                continue;
            }

            $id = trim((string) ($block['id'] ?? ''));

            if ($id === '') {
                continue;
            }

            $clean[] = [
                'id' => $id,
                'text' => (string) ($block['text'] ?? ''),
                'x' => CertificateRenderer::percent($block['x'] ?? 0),
                'y' => CertificateRenderer::percent($block['y'] ?? 0),
                'w' => max(8, CertificateRenderer::percent($block['w'] ?? 40)),
                'size' => max(8, min(72, (int) ($block['size'] ?? 12))),
                'align' => in_array($block['align'] ?? '', ['left', 'center', 'right'], true) ? $block['align'] : 'left',
                'weight' => ($block['weight'] ?? '') === 'bold' ? 'bold' : 'normal',
                'color' => CertificateRenderer::color((string) ($block['color'] ?? '#1a1a1a')),
                'font' => CertificateFonts::id((string) ($block['font'] ?? 'sans')),
            ];
        }

        return $clean;
    }

    /**
     * @param  mixed  $box
     * @param  array<string, mixed>  $fallback
     * @return array<string, mixed>
     */
    private static function box(mixed $box, array $fallback, bool $square = false): array
    {
        $box = is_array($box) ? $box : [];
        $resolved = [
            'x' => CertificateRenderer::percent($box['x'] ?? $fallback['x']),
            'y' => CertificateRenderer::percent($box['y'] ?? $fallback['y']),
            'visible' => array_key_exists('visible', $box) ? (bool) $box['visible'] : (bool) ($fallback['visible'] ?? true),
        ];

        if ($square) {
            $resolved['size'] = max(6, min(40, (float) ($box['size'] ?? $fallback['size'] ?? 12)));

            return $resolved;
        }

        $resolved['w'] = max(6, min(80, (float) ($box['w'] ?? $fallback['w'] ?? 16)));
        $resolved['h'] = max(6, min(80, (float) ($box['h'] ?? $fallback['h'] ?? 12)));

        return $resolved;
    }

    /**
     * @param  mixed  $logos
     * @return list<array<string, mixed>>
     */
    private static function logos(mixed $logos): array
    {
        if (! is_array($logos)) {
            return [];
        }

        $clean = [];

        foreach ($logos as $logo) {
            if (! is_array($logo)) {
                continue;
            }

            $id = trim((string) ($logo['id'] ?? ''));

            if ($id === '') {
                continue;
            }

            $clean[] = [
                'id' => $id,
                'x' => CertificateRenderer::percent($logo['x'] ?? 4),
                'y' => CertificateRenderer::percent($logo['y'] ?? 4),
                'w' => max(6, min(40, (float) ($logo['w'] ?? 16))),
                'h' => max(6, min(40, (float) ($logo['h'] ?? 12))),
            ];
        }

        return $clean;
    }
}
