<?php

namespace App\Support;

use App\Models\Period;
use App\Models\Unit;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class UnitExcelImporter
{
    /**
     * Headers exactos de la plantilla (asterisco = obligatorio).
     *
     * @var list<string>
     */
    public const HEADERS = [
        'CORRELATIVO*',
        'Celular',
        'PROVEEDOR*',
        'RUTA',
        'T. VEHÍCULO',
        'FECHA',
        'CONDUCTOR',
        'PLACA',
        'RESPONSABLE',
        'TIPO DE SERVICIO',
        'RUC',
        'DNI CONDUCTOR',
        'CATEGORIA',
        'COORDINADOR',
        'CORREO',
    ];

    public function downloadTemplate(): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Unidades');

        foreach (self::HEADERS as $index => $header) {
            $column = $index + 1;
            $sheet->setCellValue([$column, 1], $header);
        }

        $headerRange = 'A1:O1';
        $sheet->getStyle($headerRange)->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1A2B4C'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        // Ejemplo de fila (formato de fecha dd/mm/yyyy)
        $sheet->fromArray([
            'AGV2026-6955',
            '985555756',
            'AGROVISION PERU S.A.C.',
            'CAMPAMENT',
            'MINIBUS',
            '13/07/2026',
            'CAJUSOL SANTAMARIA DAVID',
            'T5M-121',
            'CORREA HUA',
            'CAMPAMENT',
            '20554556192',
            '46909313',
            'B',
            'Yoel Coronado',
            'conductor@agrovision.com',
        ], null, 'A2');

        $sheet->getStyle('K2')->getNumberFormat()->setFormatCode('@');
        $sheet->setCellValueExplicit('K2', '20554556192', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('L2', '46909313', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('B2', '985555756', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('O2', 'conductor@agrovision.com', DataType::TYPE_STRING);

        foreach (range('A', 'O') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $sheet->getRowDimension(1)->setRowHeight(22);

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer): void {
            $writer->save('php://output');
        }, 'plantilla-unidades.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  iterable<int, Unit>  $units
     */
    public function export(iterable $units, string $filename = 'unidades.xlsx'): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Unidades');

        $headers = [
            'PERIODO',
            'FECHA PERIODO',
            'CORRELATIVO',
            'Celular',
            'PROVEEDOR',
            'RUTA',
            'T. VEHÍCULO',
            'FECHA',
            'CONDUCTOR',
            'PLACA',
            'RESPONSABLE',
            'TIPO DE SERVICIO',
            'RUC',
            'DNI CONDUCTOR',
            'CATEGORIA',
            'COORDINADOR',
            'CORREO',
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 1], $header);
        }

        $sheet->getStyle('A1:Q1')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1A2B4C'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
            ],
        ]);

        $rowNumber = 2;

        foreach ($units as $unit) {
            $serviceDate = $unit->service_date
                ? $unit->service_date->format('d/m/Y')
                : '';
            $periodDate = $unit->period?->date
                ? $unit->period->date->format('d/m/Y')
                : '';

            $sheet->setCellValue("A{$rowNumber}", (string) ($unit->period?->name ?? ''));
            $sheet->setCellValueExplicit("B{$rowNumber}", $periodDate, DataType::TYPE_STRING);
            $sheet->setCellValueExplicit("C{$rowNumber}", (string) $unit->correlative, DataType::TYPE_STRING);
            $sheet->setCellValueExplicit("D{$rowNumber}", (string) ($unit->phone ?? ''), DataType::TYPE_STRING);
            $sheet->setCellValue("E{$rowNumber}", (string) $unit->provider);
            $sheet->setCellValue("F{$rowNumber}", (string) ($unit->route ?? ''));
            $sheet->setCellValue("G{$rowNumber}", (string) ($unit->vehicle_type ?? ''));
            $sheet->setCellValueExplicit("H{$rowNumber}", $serviceDate, DataType::TYPE_STRING);
            $sheet->setCellValue("I{$rowNumber}", (string) ($unit->driver_name ?? ''));
            $sheet->setCellValue("J{$rowNumber}", (string) ($unit->plate_number ?? ''));
            $sheet->setCellValue("K{$rowNumber}", (string) ($unit->responsible_person ?? ''));
            $sheet->setCellValue("L{$rowNumber}", (string) ($unit->service_type ?? ''));
            $sheet->setCellValueExplicit("M{$rowNumber}", (string) ($unit->ruc ?? ''), DataType::TYPE_STRING);
            $sheet->setCellValueExplicit("N{$rowNumber}", (string) ($unit->driver_dni ?? ''), DataType::TYPE_STRING);
            $sheet->setCellValue("O{$rowNumber}", (string) ($unit->category ?? ''));
            $sheet->setCellValue("P{$rowNumber}", (string) ($unit->coordinator ?? ''));
            $sheet->setCellValueExplicit("Q{$rowNumber}", (string) ($unit->email ?? ''), DataType::TYPE_STRING);

            $rowNumber++;
        }

        foreach (range('A', 'Q') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $sheet->getRowDimension(1)->setRowHeight(22);

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer): void {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @return array{imported: int, errors: list<array{row: int, messages: list<string>}>}
     */
    public function import(UploadedFile $file, Period $period): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);

        if ($rows === []) {
            return [
                'imported' => 0,
                'errors' => [[
                    'row' => 1,
                    'messages' => ['El archivo está vacío.'],
                ]],
            ];
        }

        $headerRow = array_shift($rows);
        $headerErrors = $this->validateHeaders($headerRow ?? []);

        if ($headerErrors !== []) {
            return [
                'imported' => 0,
                'errors' => [[
                    'row' => 1,
                    'messages' => $headerErrors,
                ]],
            ];
        }

        $errors = [];
        $pending = [];
        $seenCorrelatives = [];
        $seenDriverPlates = [];

        foreach ($rows as $index => $row) {
            $excelRow = $index + 2;

            if ($this->rowIsEmpty($row)) {
                continue;
            }

            $mapped = $this->mapRow($row, $excelRow);
            $rowErrors = $mapped['errors'];

            if ($rowErrors === []) {
                $correlative = $mapped['data']['correlative'];

                if (isset($seenCorrelatives[$correlative])) {
                    $rowErrors[] = "El correlativo \"{$correlative}\" está duplicado en la fila {$seenCorrelatives[$correlative]} del Excel.";
                } else {
                    $seenCorrelatives[$correlative] = $excelRow;
                }

                $driverKey = $this->driverPlateKey(
                    $mapped['data']['driver_dni'] ?? null,
                    $mapped['data']['plate_number'] ?? null,
                );

                if ($driverKey !== null) {
                    if (isset($seenDriverPlates[$driverKey])) {
                        $rowErrors[] = "El DNI del conductor y la placa ya aparecen juntos en la fila {$seenDriverPlates[$driverKey]} del Excel.";
                    } else {
                        $seenDriverPlates[$driverKey] = $excelRow;
                    }
                }
            }

            if ($rowErrors !== []) {
                $errors[] = [
                    'row' => $excelRow,
                    'messages' => $rowErrors,
                ];

                continue;
            }

            $pending[$excelRow] = $mapped['data'];
        }

        if ($pending === []) {
            if ($errors === []) {
                $errors[] = [
                    'row' => 2,
                    'messages' => ['No se encontraron filas con datos para importar.'],
                ];
            }

            return [
                'imported' => 0,
                'errors' => $errors,
            ];
        }

        $existingCorrelatives = Unit::query()
            ->whereIn('correlative', array_column($pending, 'correlative'))
            ->pluck('correlative')
            ->all();

        $existingDriverPlates = Unit::query()
            ->where('period_id', $period->id)
            ->whereNotNull('driver_dni')
            ->where('driver_dni', '!=', '')
            ->whereNotNull('plate_number')
            ->where('plate_number', '!=', '')
            ->get(['driver_dni', 'plate_number'])
            ->mapWithKeys(fn (Unit $unit) => [
                $this->driverPlateKey($unit->driver_dni, $unit->plate_number) => true,
            ])
            ->all();

        foreach ($pending as $excelRow => $data) {
            $rowMessages = [];

            if (in_array($data['correlative'], $existingCorrelatives, true)) {
                $rowMessages[] = "Ya existe una unidad con el correlativo \"{$data['correlative']}\".";
            }

            $driverKey = $this->driverPlateKey(
                $data['driver_dni'] ?? null,
                $data['plate_number'] ?? null,
            );

            if ($driverKey !== null && isset($existingDriverPlates[$driverKey])) {
                $rowMessages[] = "Ya existe una unidad con el mismo DNI del conductor ({$data['driver_dni']}) y placa ({$data['plate_number']}) en este periodo.";
            }

            if ($rowMessages !== []) {
                $errors[] = [
                    'row' => $excelRow,
                    'messages' => $rowMessages,
                ];
                unset($pending[$excelRow]);
            }
        }

        if ($errors !== []) {
            return [
                'imported' => 0,
                'errors' => array_values($errors),
            ];
        }

        $imported = 0;

        DB::transaction(function () use ($pending, $period, &$imported): void {
            foreach ($pending as $data) {
                Unit::create([
                    ...$data,
                    'period_id' => $period->id,
                ]);
                $imported++;
            }
        });

        return [
            'imported' => $imported,
            'errors' => [],
        ];
    }

    /**
     * @param  array<int, mixed>  $headerRow
     * @return list<string>
     */
    private function validateHeaders(array $headerRow): array
    {
        $errors = [];

        foreach (self::HEADERS as $index => $expected) {
            $actual = trim((string) ($headerRow[$index] ?? ''));
            $normalizedExpected = mb_strtoupper($this->normalizeHeader($expected));
            $normalizedActual = mb_strtoupper($this->normalizeHeader($actual));

            if ($normalizedActual !== $normalizedExpected) {
                $errors[] = "La columna ".($index + 1)." debe llamarse \"{$expected}\" (se recibió \"{$actual}\").";
            }
        }

        return $errors;
    }

    private function normalizeHeader(string $header): string
    {
        $header = str_replace(['*', ' '], '', $header);
        $header = str_replace(['Á', 'É', 'Í', 'Ó', 'Ú', 'Ü', 'Ñ'], ['A', 'E', 'I', 'O', 'U', 'U', 'N'], mb_strtoupper($header));

        return $header;
    }

    /**
     * @param  array<int, mixed>  $row
     */
    private function rowIsEmpty(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    /**
     * @param  array<int, mixed>  $row
     * @return array{data: array<string, mixed>, errors: list<string>}
     */
    private function mapRow(array $row, int $excelRow): array
    {
        $correlative = $this->stringValue($row[0] ?? null);
        $phone = $this->stringValue($row[1] ?? null);
        $provider = $this->stringValue($row[2] ?? null);
        $route = $this->stringValue($row[3] ?? null);
        $vehicleType = $this->stringValue($row[4] ?? null);
        $rawDate = $row[5] ?? null;
        $driverName = $this->stringValue($row[6] ?? null);
        $plateNumber = $this->stringValue($row[7] ?? null);
        $responsible = $this->stringValue($row[8] ?? null);
        $serviceType = $this->stringValue($row[9] ?? null);
        $ruc = $this->stringValue($row[10] ?? null);
        $driverDni = $this->stringValue($row[11] ?? null);
        $category = $this->stringValue($row[12] ?? null);
        $coordinator = $this->stringValue($row[13] ?? null);
        $email = $this->stringValue($row[14] ?? null);

        $errors = [];
        $serviceDate = null;

        if ($correlative === null) {
            $errors[] = 'El campo CORRELATIVO* es obligatorio.';
        }

        if ($provider === null) {
            $errors[] = 'El campo PROVEEDOR* es obligatorio.';
        }

        if ($email !== null && ! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'El campo CORREO no es un email válido.';
        }

        if ($this->hasValue($rawDate)) {
            $parsed = $this->parseDate($rawDate);

            if ($parsed === null) {
                $errors[] = 'La FECHA debe tener el formato dd/mm/yyyy.';
            } else {
                $serviceDate = $parsed;
            }
        }

        if ($errors !== []) {
            return ['data' => [], 'errors' => $errors];
        }

        $payload = [
            'correlative' => $correlative,
            'phone' => $phone,
            'email' => $email,
            'provider' => $provider,
            'route' => $route,
            'vehicle_type' => $vehicleType,
            'service_date' => $serviceDate,
            'driver_name' => $driverName,
            'plate_number' => $plateNumber,
            'responsible_person' => $responsible,
            'service_type' => $serviceType,
            'ruc' => $ruc,
            'driver_dni' => $driverDni,
            'category' => $category,
            'coordinator' => $coordinator,
        ];

        $validator = Validator::make($payload, [
            'correlative' => ['required', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'provider' => ['required', 'string', 'max:255'],
            'route' => ['nullable', 'string', 'max:255'],
            'vehicle_type' => ['nullable', 'string', 'max:100'],
            'service_date' => ['nullable', 'date'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'plate_number' => ['nullable', 'string', 'max:20'],
            'responsible_person' => ['nullable', 'string', 'max:255'],
            'service_type' => ['nullable', 'string', 'max:100'],
            'ruc' => ['nullable', 'string', 'regex:/^\d{11}$/'],
            'driver_dni' => ['nullable', 'string', 'max:20', 'regex:/^\d+$/'],
            'category' => ['nullable', 'string', 'max:20'],
            'coordinator' => ['nullable', 'string', 'max:255'],
        ], [
            'correlative.required' => 'El campo CORRELATIVO* es obligatorio.',
            'provider.required' => 'El campo PROVEEDOR* es obligatorio.',
            'email.email' => 'El campo CORREO no es un email válido.',
            'ruc.regex' => 'El campo RUC debe tener 11 dígitos.',
            'driver_dni.regex' => 'El campo DNI CONDUCTOR solo debe contener números.',
        ]);

        if ($validator->fails()) {
            return [
                'data' => [],
                'errors' => $validator->errors()->all(),
            ];
        }

        return [
            'data' => $validator->validated(),
            'errors' => [],
        ];
    }

    private function hasValue(mixed $value): bool
    {
        return trim((string) $value) !== '';
    }

    private function driverPlateKey(?string $driverDni, ?string $plateNumber): ?string
    {
        if ($driverDni === null || $driverDni === '' || $plateNumber === null || $plateNumber === '') {
            return null;
        }

        return mb_strtolower(trim($driverDni)).'|'.mb_strtoupper(trim($plateNumber));
    }

    private function stringValue(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_float($value) || is_int($value)) {
            // Evitar notación científica (RUC, DNI, celular)
            if (is_float($value) && floor($value) == $value) {
                $value = number_format($value, 0, '', '');
            } else {
                $value = (string) $value;
            }
        }

        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private function parseDate(mixed $value): ?string
    {
        if ($value === null || trim((string) $value) === '') {
            return null;
        }

        if (is_numeric($value)) {
            try {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $value))
                    ->format('Y-m-d');
            } catch (\Throwable) {
                return null;
            }
        }

        $raw = trim((string) $value);

        if (! preg_match('/^(\d{2})\/(\d{2})\/(\d{4})$/', $raw, $matches)) {
            return null;
        }

        $day = (int) $matches[1];
        $month = (int) $matches[2];
        $year = (int) $matches[3];

        if (! checkdate($month, $day, $year)) {
            return null;
        }

        return sprintf('%04d-%02d-%02d', $year, $month, $day);
    }
}
