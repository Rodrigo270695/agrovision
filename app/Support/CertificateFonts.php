<?php

namespace App\Support;

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
