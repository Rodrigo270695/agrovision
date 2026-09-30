<?php

namespace App\Support;

use App\Models\Certificate;
use App\Models\CertificateTemplate;
use App\Models\Induction;
use App\Models\InductionAttendee;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Storage;

final class CertificateRenderer
{
    /**
     * @var array<int, string>
     */
    private const MONTHS = [
        1 => 'enero',
        2 => 'febrero',
        3 => 'marzo',
        4 => 'abril',
        5 => 'mayo',
        6 => 'junio',
        7 => 'julio',
        8 => 'agosto',
        9 => 'septiembre',
        10 => 'octubre',
        11 => 'noviembre',
        12 => 'diciembre',
    ];

    /**
     * @param  array<string, string>  $custom
     * @return array<string, string>
     */
    public static function variables(
        CertificateTemplate $template,
        Induction $induction,
        InductionAttendee $attendee,
        CarbonInterface $issuedOn,
        CarbonInterface $expiresOn,
        string $code,
        array $custom = [],
    ): array {
        $values = [
            'nombre' => trim($attendee->driver_name) !== '' ? $attendee->driver_name : '—',
            'dni' => trim((string) $attendee->driver_dni) !== '' ? (string) $attendee->driver_dni : '—',
            'curso' => trim((string) $induction->title) !== '' ? (string) $induction->title : '—',
            'temario' => trim((string) $induction->temario) !== '' ? (string) $induction->temario : '—',
            'fecha' => self::longDate($induction->session_date ?? $induction->scheduled_at ?? $issuedOn),
            'horas' => self::hours($induction),
            'emision' => $issuedOn->format('d/m/Y'),
            'vencimiento' => $expiresOn->format('d/m/Y'),
            'codigo' => $code,
            'firmante' => trim((string) $template->issuer_name) !== '' ? (string) $template->issuer_name : '—',
            'cargo' => trim((string) $template->issuer_title) !== '' ? (string) $template->issuer_title : '',
            'sede' => trim((string) ($induction->sede ?: $induction->location)) !== ''
                ? (string) ($induction->sede ?: $induction->location)
                : '—',
            'empresa' => trim((string) $attendee->provider) !== '' ? (string) $attendee->provider : '—',
        ];

        foreach ($custom as $key => $value) {
            $values[(string) $key] = (string) $value;
        }

        return $values;
    }

    /**
     * @param  array<string, string>  $values
     */
    public static function fill(string $text, array $values): string
    {
        return (string) preg_replace_callback(
            '/\{\{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\}\}/',
            fn (array $match) => $values[$match[1]] ?? '',
            $text,
        );
    }

    public static function hours(Induction $induction): string
    {
        $minutes = (int) ($induction->estimated_minutes ?? 0);

        if ($minutes <= 0 && $induction->start_time && $induction->end_time) {
            try {
                $start = CarbonImmutable::parse($induction->start_time);
                $end = CarbonImmutable::parse($induction->end_time);
                $minutes = max(0, (int) $start->diffInMinutes($end, true));
            } catch (\Throwable) {
                $minutes = 0;
            }
        }

        if ($minutes <= 0) {
            return '—';
        }

        $hours = $minutes / 60;

        if (abs($hours - round($hours)) < 0.05) {
            return str_pad((string) (int) round($hours), 2, '0', STR_PAD_LEFT);
        }

        return number_format($hours, 1, '.', '');
    }

    public static function longDate(mixed $date): string
    {
        try {
            $parsed = CarbonImmutable::parse($date);
        } catch (\Throwable) {
            return '—';
        }

        $month = self::MONTHS[$parsed->month] ?? $parsed->format('m');

        return $parsed->day.' de '.$month.' de '.$parsed->year;
    }

    public static function dataUri(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $absolute = Storage::disk('public')->path($path);

        if (! is_file($absolute)) {
            return null;
        }

        $info = @getimagesize($absolute);

        if ($info === false) {
            return null;
        }

        $type = $info[2] ?? 0;

        if (! in_array($type, [IMAGETYPE_GIF, IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP, IMAGETYPE_BMP], true)) {
            return null;
        }

        $binary = file_get_contents($absolute);

        if ($binary === false || $binary === '') {
            return null;
        }

        $mime = mime_content_type($absolute) ?: 'image/png';
        [$binary, $mime] = self::pdfImage($binary, $mime);

        if ($binary === '') {
            return null;
        }

        return 'data:'.$mime.';base64,'.base64_encode($binary);
    }

    /**
     * @param  array<string, string>  $values
     * @return list<array{text: string, x: float, y: float, w: float, size: int, align: string, weight: string, font: string, color: string}>
     */
    public static function blocks(CertificateTemplate $template, array $values): array
    {
        $blocks = [];

        foreach ($template->resolvedLayout()['blocks'] as $block) {
            if (! is_array($block)) {
                continue;
            }

            $blocks[] = [
                'text' => self::fill((string) ($block['text'] ?? ''), $values),
                'x' => self::percent($block['x'] ?? 0),
                'y' => self::percent($block['y'] ?? 0),
                'w' => self::percent($block['w'] ?? 40),
                'size' => max(8, min(96, (int) ($block['size'] ?? 12))),
                'align' => in_array($block['align'] ?? '', ['left', 'center', 'right'], true) ? $block['align'] : 'left',
                'weight' => ($block['weight'] ?? '') === 'bold' ? 'bold' : 'normal',
                'font' => self::fontFamily((string) ($block['font'] ?? 'sans')),
                'color' => self::color((string) ($block['color'] ?? '#1a1a1a')),
            ];
        }

        return $blocks;
    }

    public static function percent(mixed $value): float
    {
        return max(0, min(100, (float) $value));
    }

    public static function fontFamily(string $font): string
    {
        return CertificateFonts::pdfFamily($font);
    }

    public static function color(string $value): string
    {
        return preg_match('/^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/', $value) ? $value : '#1a1a1a';
    }

    /**
     * @return array{0: string, 1: string}
     */
    private static function pdfImage(string $binary, string $mime): array
    {
        if (! function_exists('imagecreatefromstring')) {
            return [$binary, $mime];
        }

        $image = @imagecreatefromstring($binary);

        if (! $image) {
            return [$binary, $mime];
        }

        $width = imagesx($image);
        $height = imagesy($image);
        $max = 2000;
        $tooBig = $width > $max || $height > $max;
        $webp = $mime === 'image/webp';

        if (! $tooBig && ! $webp) {
            imagedestroy($image);

            return [$binary, $mime];
        }

        $scale = min($max / max($width, 1), $max / max($height, 1), 1);
        $newWidth = max(1, (int) round($width * $scale));
        $newHeight = max(1, (int) round($height * $scale));
        $canvas = imagecreatetruecolor($newWidth, $newHeight);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 0, 0, 0, 127);
        imagefilledrectangle($canvas, 0, 0, $newWidth, $newHeight, $transparent);
        imagecopyresampled($canvas, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
        imagedestroy($image);

        ob_start();
        imagepng($canvas);
        $encoded = (string) ob_get_clean();
        imagedestroy($canvas);

        return [$encoded !== '' ? $encoded : $binary, $encoded !== '' ? 'image/png' : $mime];
    }
}
