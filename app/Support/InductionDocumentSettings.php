<?php

namespace App\Support;

use App\Models\Induction;
use App\Models\TenantSetting;
use Illuminate\Support\Carbon;

final class InductionDocumentSettings
{
    /**
     * @return array{
     *     register_code: string,
     *     register_revision: string,
     *     register_date: string|null,
     *     risst_code: string,
     *     risst_revision: string,
     *     ritran_code: string,
     *     ritran_revision: string
     * }
     */
    public static function current(): array
    {
        $settings = TenantSetting::current();

        return [
            'register_code' => self::text($settings->register_code, 'GH-GD-FO-0609'),
            'register_revision' => self::text($settings->register_revision, '006'),
            'register_date' => self::date($settings->register_date),
            'risst_code' => self::text($settings->risst_code, 'PE-M-SST-002'),
            'risst_revision' => self::text($settings->risst_revision, '2'),
            'ritran_code' => self::text($settings->ritran_code, 'PE-M-SST-004'),
            'ritran_revision' => self::text($settings->ritran_revision, '1'),
        ];
    }

    /**
     * Copia los códigos vigentes a una inducción nueva.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public static function stamp(array $data): array
    {
        $current = self::current();
        $data['document_code'] = $current['register_code'];
        $data['document_revision'] = $current['register_revision'];
        $data['document_date'] = $current['register_date'];
        $data['risst_code'] = $current['risst_code'];
        $data['risst_revision'] = $current['risst_revision'];
        $data['risst_version'] = $current['risst_revision'];
        $data['ritran_code'] = $current['ritran_code'];
        $data['ritran_revision'] = $current['ritran_revision'];

        return $data;
    }

    /**
     * Lo guardado en la inducción manda. Si falta, usa el código vigente.
     *
     * @return array{
     *     register_code: string,
     *     register_revision: string,
     *     register_date: string,
     *     risst_code: string,
     *     risst_revision: string,
     *     ritran_code: string,
     *     ritran_revision: string
     * }
     */
    public static function forPdf(Induction $induction): array
    {
        $current = self::current();

        return [
            'register_code' => $current['register_code'],
            'register_revision' => $current['register_revision'],
            'register_date' => self::displayDate($current['register_date']),
            'risst_code' => $current['risst_code'],
            'risst_revision' => $current['risst_revision'],
            'ritran_code' => $current['ritran_code'],
            'ritran_revision' => $current['ritran_revision'],
        ];
    }

    private static function text(mixed $value, string $fallback): string
    {
        $text = trim((string) $value);

        return $text !== '' ? $text : $fallback;
    }

    private static function date(mixed $value): ?string
    {
        if ($value instanceof Carbon) {
            return $value->toDateString();
        }

        $text = trim((string) $value);

        return $text !== '' ? $text : null;
    }

    private static function displayDate(?string $value): string
    {
        if ($value === null || $value === '') {
            return '—';
        }

        try {
            return Carbon::parse($value)->format('d-m-Y');
        } catch (\Throwable) {
            return $value;
        }
    }
}
