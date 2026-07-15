<?php

namespace App\Support;

/**
 * Genera un gráfico pastel SVG compatible con DomPDF.
 */
final class ParetoPieChart
{
    /**
     * @return array{scored: float, remaining: float, total: float, percent: float, svg: string}
     */
    public static function build(float $scored, float $total, int $size = 118): array
    {
        $total = max(0.0, round($total, 2));
        $scored = max(0.0, min($total, round($scored, 2)));
        $remaining = max(0.0, round($total - $scored, 2));
        $percent = $total > 0 ? round(($scored / $total) * 100, 2) : 0.0;

        $svg = self::svg($percent, $size);

        return [
            'scored' => $scored,
            'remaining' => $remaining,
            'total' => $total,
            'percent' => $percent,
            'svg' => $svg,
        ];
    }

    private static function svg(float $percent, int $size): string
    {
        $radius = ($size / 2) - 4;
        $cx = $size / 2;
        $cy = $size / 2;
        $okColor = '#15803d';
        $restColor = '#dbe4ef';

        if ($percent <= 0) {
            return self::wrap($size, sprintf(
                '<circle cx="%s" cy="%s" r="%s" fill="%s"/>',
                $cx,
                $cy,
                $radius,
                $restColor
            ), $percent);
        }

        if ($percent >= 100) {
            return self::wrap($size, sprintf(
                '<circle cx="%s" cy="%s" r="%s" fill="%s"/>',
                $cx,
                $cy,
                $radius,
                $okColor
            ), $percent);
        }

        $angle = ($percent / 100) * 360;
        $large = $angle > 180 ? 1 : 0;
        $startX = $cx;
        $startY = $cy - $radius;
        $end = self::pointOnCircle($cx, $cy, $radius, $angle - 90);

        $paths = sprintf(
            '<circle cx="%1$s" cy="%2$s" r="%3$s" fill="%4$s"/>'.
            '<path d="M %1$s %2$s L %5$s %6$s A %3$s %3$s 0 %7$d 1 %8$s %9$s Z" fill="%10$s"/>',
            $cx,
            $cy,
            $radius,
            $restColor,
            $startX,
            $startY,
            $large,
            $end[0],
            $end[1],
            $okColor
        );

        return self::wrap($size, $paths, $percent);
    }

    /**
     * @return array{0: float, 1: float}
     */
    private static function pointOnCircle(float $cx, float $cy, float $r, float $degrees): array
    {
        $radians = deg2rad($degrees);

        return [
            round($cx + ($r * cos($radians)), 2),
            round($cy + ($r * sin($radians)), 2),
        ];
    }

    private static function wrap(int $size, string $inner, float $percent): string
    {
        $label = number_format($percent, 1, '.', '').'%';

        return sprintf(
            '<svg xmlns="http://www.w3.org/2000/svg" width="%1$d" height="%1$d" viewBox="0 0 %1$d %1$d">'.
            '%2$s'.
            '<circle cx="%3$s" cy="%3$s" r="%4$s" fill="#ffffff"/>'.
            '<text x="%3$s" y="%5$s" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="13" font-weight="bold" fill="#1a2b4c">%6$s</text>'.
            '</svg>',
            $size,
            $inner,
            $size / 2,
            max(18, ($size / 2) - 28),
            ($size / 2) + 5,
            $label
        );
    }
}
