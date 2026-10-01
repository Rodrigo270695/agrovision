<?php

namespace App\Support;

use FontLib\Font;

class CertificateFonts
{
    /**
     * @return list<array{id: string, label: string, face: string, file: string|null, preview: string, pdf: string}>
     */
    public static function all(): array
    {
        $custom = [
            ['great-vibes', 'Corrida · Great Vibes', 'GreatVibes', 'GreatVibes-Regular.ttf'],
            ['allura', 'Corrida · Allura', 'Allura', 'Allura-Regular.ttf'],
            ['alex-brush', 'Corrida · Alex Brush', 'AlexBrush', 'AlexBrush-Regular.ttf'],
            ['pinyon', 'Corrida · Pinyon', 'PinyonScript', 'PinyonScript-Regular.ttf'],
            ['tangerine', 'Corrida · Tangerine', 'Tangerine', 'Tangerine-Regular.ttf'],
            ['sacramento', 'Corrida · Sacramento', 'Sacramento', 'Sacramento-Regular.ttf'],
            ['pacifico', 'Corrida · Pacifico', 'Pacifico', 'Pacifico-Regular.ttf'],
            ['playfair', 'Playfair', 'PlayfairDisplay', 'PlayfairDisplay-Regular.ttf'],
            ['cinzel', 'Cinzel', 'Cinzel', 'Cinzel-Regular.ttf'],
            ['cormorant', 'Cormorant', 'CormorantGaramond', 'CormorantGaramond-Regular.ttf'],
            ['libre', 'Libre Baskerville', 'LibreBaskerville', 'LibreBaskerville-Regular.ttf'],
            ['merriweather', 'Merriweather', 'Merriweather', 'Merriweather-Regular.ttf'],
            ['lato', 'Lato', 'Lato', 'Lato-Regular.ttf'],
            ['montserrat', 'Montserrat', 'Montserrat', 'Montserrat-Regular.ttf'],
            ['roboto', 'Roboto', 'Roboto', 'Roboto-Regular.ttf'],
            ['raleway', 'Raleway', 'Raleway', 'Raleway-Regular.ttf'],
            ['oswald', 'Oswald', 'Oswald', 'Oswald-Regular.ttf'],
            ['bebas', 'Bebas Neue', 'BebasNeue', 'BebasNeue-Regular.ttf'],
        ];

        $fonts = [
            [
                'id' => 'sans',
                'label' => 'Sans',
                'face' => 'DejaVu Sans',
                'file' => null,
                'preview' => 'Arial, Helvetica, sans-serif',
                'pdf' => 'DejaVu Sans, sans-serif',
            ],
            [
                'id' => 'serif',
                'label' => 'Serif',
                'face' => 'DejaVu Serif',
                'file' => null,
                'preview' => 'Georgia, "Times New Roman", serif',
                'pdf' => 'DejaVu Serif, serif',
            ],
            [
                'id' => 'mono',
                'label' => 'Monoespacio',
                'face' => 'DejaVu Sans Mono',
                'file' => null,
                'preview' => 'ui-monospace, "Courier New", monospace',
                'pdf' => 'DejaVu Sans Mono, monospace',
            ],
        ];

        foreach ($custom as [$id, $label, $face, $file]) {
            $fonts[] = [
                'id' => $id,
                'label' => $label,
                'face' => $face,
                'file' => $file,
                'preview' => $face.', cursive',
                'pdf' => $face.', cursive',
            ];
        }

        return $fonts;
    }

    public static function id(string $font): string
    {
        foreach (self::all() as $item) {
            if ($item['id'] === $font) {
                return $item['id'];
            }
        }

        return 'sans';
    }

    public static function pdfFamily(string $font): string
    {
        foreach (self::all() as $item) {
            if ($item['id'] === $font) {
                return $item['pdf'];
            }
        }

        return 'DejaVu Sans, sans-serif';
    }

    /**
     * @return list<array{id: string, label: string, family: string, url: string|null}>
     */
    public static function forFrontend(): array
    {
        return array_map(fn (array $font) => [
            'id' => $font['id'],
            'label' => $font['label'],
            'family' => $font['preview'],
            'url' => $font['file'] ? asset('fonts/certificates/'.$font['file']) : null,
        ], self::all());
    }

    /**
     * DomPDF draws custom fonts below the CSS top and stretches line boxes.
     * These values put the baseline and the line gap where the editor shows them.
     *
     * @return array{line_height: float, nudge_mm: float}
     */
    public static function pdfPlacement(string $pdfFamily, float $sizePt): array
    {
        [$ascender, $descender] = self::normalizedMetrics($pdfFamily);
        $content = ($ascender - $descender) / 1000;
        $ascenderEm = $ascender / 1000;
        $browserHalf = max(0, (1.25 - $content) / 2);
        $browserBaseline = $browserHalf + $ascenderEm;
        $lineHeight = $content > 0 ? 1.25 / ($content * 1.1) : 1.25;
        $nudgePt = (1.0 - $browserBaseline) * $sizePt;

        return [
            'line_height' => round($lineHeight, 4),
            'nudge_mm' => $nudgePt * 25.4 / 72,
        ];
    }

    /**
     * @return array{0: float, 1: float}
     */
    private static function normalizedMetrics(string $pdfFamily): array
    {
        $face = trim(strtok($pdfFamily, ',') ?: $pdfFamily);

        if (str_starts_with($face, 'DejaVu')) {
            return [928.0, -236.0];
        }

        static $cache = [];

        if (isset($cache[$face])) {
            return $cache[$face];
        }

        $file = null;

        foreach (self::all() as $font) {
            if ($font['face'] === $face && $font['file'] !== null) {
                $file = public_path('fonts/certificates/'.$font['file']);
                break;
            }
        }

        if ($file === null || ! is_file($file)) {
            return $cache[$face] = [928.0, -236.0];
        }

        $font = Font::load($file);
        $font->parse();
        $head = $font->getData('head');
        $hhea = $font->getData('hhea');
        $em = max(1, (int) ($head['unitsPerEm'] ?? 1000));
        $font->close();

        return $cache[$face] = [
            (float) $hhea['ascent'] / $em * 1000,
            (float) $hhea['descent'] / $em * 1000,
        ];
    }

    public static function pdfFaceCss(): string
    {
        $css = '';

        foreach (self::all() as $font) {
            if ($font['file'] === null) {
                continue;
            }

            $path = public_path('fonts/certificates/'.$font['file']);

            if (! is_file($path)) {
                continue;
            }

            $src = str_replace('\\', '/', $path);
            $face = $font['face'];
            $css .= "@font-face { font-family: {$face}; font-weight: normal; font-style: normal; src: url('{$src}') format('truetype'); }\n";
            $css .= "@font-face { font-family: {$face}; font-weight: bold; font-style: normal; src: url('{$src}') format('truetype'); }\n";
        }

        return $css;
    }
}
