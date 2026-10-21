<?php

namespace App\Support;

use Carbon\Carbon;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

final class FleetExcelSupport
{
    public static function normalizePlate(?string $plate): string
    {
        return mb_strtoupper(trim((string) $plate));
    }

    public static function normalizeHeader(mixed $value): string
    {
        $text = mb_strtolower(trim((string) $value));
        $text = str_replace(
            ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'],
            ['a', 'e', 'i', 'o', 'u', 'u', 'n'],
            $text,
        );

        return preg_replace('/\s+/u', ' ', $text) ?? $text;
    }

    public static function parseDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        if (is_numeric($value)) {
            try {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $value))
                    ->toDateString();
            } catch (\Throwable) {
                return null;
            }
        }

        $text = trim((string) $value);

        if ($text === '') {
            return null;
        }

        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $text, $match) === 1) {
            return $match[1];
        }

        if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})/', $text, $match) === 1) {
            try {
                return Carbon::createFromFormat('d/m/Y', "{$match[1]}/{$match[2]}/{$match[3]}")
                    ->toDateString();
            } catch (\Throwable) {
                return null;
            }
        }

        try {
            return Carbon::parse($text)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param  list<list<mixed>>  $rows
     * @param  list<string>  $requiredHeaders
     * @return array{header: list<string>, body: list<list<mixed>>, header_row: int}
     */
    public static function splitHeaderAndBody(array $rows, array $requiredHeaders): array
    {
        foreach ($rows as $index => $row) {
            $normalized = array_map(
                fn ($cell) => self::normalizeHeader($cell),
                $row,
            );

            $hasAll = true;
            foreach ($requiredHeaders as $required) {
                $found = false;
                foreach ($normalized as $header) {
                    if ($header === $required || str_contains($header, $required)) {
                        $found = true;
                        break;
                    }
                }
                if (! $found) {
                    $hasAll = false;
                    break;
                }
            }

            if ($hasAll) {
                return [
                    'header' => array_map('strval', $row),
                    'body' => array_slice($rows, $index + 1),
                    'header_row' => $index + 1,
                ];
            }
        }

        return [
            'header' => array_map('strval', $rows[0] ?? []),
            'body' => array_slice($rows, 1),
            'header_row' => 1,
        ];
    }

    /**
     * @param  list<string>  $headers
     */
    public static function headerIndex(array $headers, string $needle): ?int
    {
        $needle = self::normalizeHeader($needle);

        foreach ($headers as $index => $header) {
            $normalized = self::normalizeHeader($header);
            if ($normalized === $needle || str_contains($normalized, $needle)) {
                return $index;
            }
        }

        return null;
    }

    public static function cellValue(array $row, ?int $index): ?string
    {
        if ($index === null || ! array_key_exists($index, $row)) {
            return null;
        }

        $value = trim((string) ($row[$index] ?? ''));

        return $value !== '' ? $value : null;
    }

    public static function rowIsEmpty(array $row): bool
    {
        foreach ($row as $cell) {
            if (trim((string) $cell) !== '') {
                return false;
            }
        }

        return true;
    }
}
