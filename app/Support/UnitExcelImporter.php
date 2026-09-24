<?php

namespace App\Support;

use App\Models\Period;
use App\Models\Unit;
use Carbon\Carbon;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
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

        $headerRange = 'A1:N1';
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

        $coordinators = SystemRoles::coordinators();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $coordinators = $coordinators->where('id', Auth::id())->values();
        }

        $firstCoordinatorName = $coordinators->first()?->name ?? '';

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
            $firstCoordinatorName,
        ], null, 'A2');

        $sheet->getStyle('K2')->getNumberFormat()->setFormatCode('@');
        $sheet->setCellValueExplicit('K2', '20554556192', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('L2', '46909313', DataType::TYPE_STRING);
        $sheet->setCellValueExplicit('B2', '985555756', DataType::TYPE_STRING);

        foreach (range('A', 'N') as $column) {
            $sheet->getColumnDimension($column)->setAutoSize(true);
        }

        $sheet->getRowDimension(1)->setRowHeight(22);

        // Hoja de lista de coordinadores + validación de celda COORDINADOR (columna N).
        $listSheet = $spreadsheet->createSheet();
        $listSheet->setTitle('Coordinadores');
        $listSheet->setCellValue('A1', 'NOMBRE COMPLETO');
        $listSheet->getStyle('A1')->applyFromArray([
            'font' => [
                'bold' => true,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1A2B4C'],
            ],
        ]);

        $row = 2;
        foreach ($coordinators as $coordinator) {
            $listSheet->setCellValue("A{$row}", $coordinator->name);
            $row++;
        }

        if ($coordinators->isEmpty()) {
            $listSheet->setCellValue('A2', '(Sin coordinadores registrados)');
            $row = 3;
        }

        $listSheet->getColumnDimension('A')->setAutoSize(true);

        $lastListRow = max(2, $row - 1);
        $validation = $sheet->getCell('N2')->getDataValidation();
        $validation->setType(DataValidation::TYPE_LIST);
        $validation->setErrorStyle(DataValidation::STYLE_STOP);
        $validation->setAllowBlank(true);
        $validation->setShowInputMessage(true);
        $validation->setShowErrorMessage(true);
        $validation->setShowDropDown(true);
        $validation->setErrorTitle('Coordinador inválido');
        $validation->setError('Selecciona un coordinador de la lista.');
        $validation->setPromptTitle('Coordinador');
        $validation->setPrompt('Elige un nombre de la hoja Coordinadores.');
        $validation->setFormula1("Coordinadores!\$A\$2:\$A\${$lastListRow}");
        $validation->setSqref('N2:N1000');

        $spreadsheet->setActiveSheetIndex(0);

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
        ];

        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 1], $header);
        }

        $sheet->getStyle('A1:P1')->applyFromArray([
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
            $sheet->setCellValue(
                "P{$rowNumber}",
                (string) ($unit->coordinatorUser?->name ?? ''),
            );

            $rowNumber++;
        }

        foreach (range('A', 'P') as $column) {
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
     * @return array{imported: int, created: int, updated: int, errors: list<array{row: int, messages: list<string>}>}
     */
    public function import(UploadedFile $file, Period $period): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheet = $spreadsheet->getSheetByName('Unidades')
            ?? $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, false);

        if ($rows === []) {
            return [
                'imported' => 0,
                'created' => 0,
                'updated' => 0,
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
                'created' => 0,
                'updated' => 0,
                'errors' => [[
                    'row' => 1,
                    'messages' => $headerErrors,
                ]],
            ];
        }

        $errors = [];
        $pending = [];
        $seenCorrelatives = [];
        $seenPlates = [];
        $coordinators = SystemRoles::coordinators();

        foreach ($rows as $index => $row) {
            $excelRow = $index + 2;

            if ($this->rowIsEmpty($row)) {
                continue;
            }

            $mapped = $this->mapRow($row, $excelRow, $coordinators);
            $rowErrors = $mapped['errors'];

            if ($rowErrors === []) {
                $correlative = $mapped['data']['correlative'] ?? null;

                if (is_string($correlative) && $correlative !== '') {
                    if (isset($seenCorrelatives[$correlative])) {
                        $rowErrors[] = "El correlativo \"{$correlative}\" está duplicado en la fila {$seenCorrelatives[$correlative]} del Excel.";
                    } else {
                        $seenCorrelatives[$correlative] = $excelRow;
                    }
                }

                $plate = (string) $mapped['data']['plate_number'];

                if (isset($seenPlates[$plate])) {
                    $rowErrors[] = "La placa \"{$plate}\" está duplicada en la fila {$seenPlates[$plate]} del Excel.";
                } else {
                    $seenPlates[$plate] = $excelRow;
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
                'created' => 0,
                'updated' => 0,
                'errors' => $errors,
            ];
        }

        $plates = array_values(array_unique(array_column($pending, 'plate_number')));
        $unitsByPlate = Unit::query()
            ->where('period_id', $period->id)
            ->whereIn(DB::raw('upper(plate_number)'), $plates)
            ->get(['id', 'plate_number', 'correlative'])
            ->groupBy(fn (Unit $unit) => mb_strtoupper((string) $unit->plate_number));

        $correlatives = array_values(array_filter(array_column($pending, 'correlative')));
        $correlativeOwners = $correlatives === []
            ? collect()
            : Unit::query()
                ->whereIn('correlative', $correlatives)
                ->pluck('id', 'correlative');

        foreach ($pending as $excelRow => $data) {
            $rowMessages = [];
            $plate = (string) $data['plate_number'];
            $matches = $unitsByPlate->get($plate, collect());
            $unitId = null;

            if ($matches->count() > 1) {
                $rowMessages[] = "Hay más de una unidad con la placa \"{$plate}\" en este periodo.";
            } elseif ($matches->count() === 1) {
                $unitId = (int) $matches->first()->id;
            }

            $correlative = $data['correlative'] ?? null;

            if ($unitId === null && ($correlative === null || $correlative === '')) {
                $rowMessages[] = 'El correlativo es obligatorio cuando la placa es nueva.';
            }

            if ($unitId === null && ($data['provider'] ?? null) === null) {
                $rowMessages[] = 'El proveedor es obligatorio cuando la placa es nueva.';
            }

            if (is_string($correlative) && $correlative !== '' && $correlativeOwners->has($correlative)) {
                $ownerId = (int) $correlativeOwners->get($correlative);

                if ($unitId === null || $ownerId !== $unitId) {
                    $rowMessages[] = "Ya existe otra unidad con el correlativo \"{$correlative}\".";
                }
            }

            if ($rowMessages !== []) {
                $errors[] = [
                    'row' => $excelRow,
                    'messages' => $rowMessages,
                ];
                unset($pending[$excelRow]);

                continue;
            }

            $pending[$excelRow]['unit_id'] = $unitId;
        }

        if ($errors !== []) {
            return [
                'imported' => 0,
                'created' => 0,
                'updated' => 0,
                'errors' => array_values($errors),
            ];
        }

        if (SystemRoles::currentIsScopedCoordinator()) {
            $authId = (int) Auth::id();
            foreach ($pending as $excelRow => $data) {
                $pending[$excelRow]['coordinator_id'] = $authId;
            }
        }

        $created = 0;
        $updated = 0;

        DB::transaction(function () use ($pending, $period, &$created, &$updated): void {
            foreach ($pending as $data) {
                $unitId = $data['unit_id'] ?? null;
                unset($data['unit_id']);

                $vehicleType = UnitCatalog::rememberVehicleType($data['vehicle_type'] ?? null);
                $category = UnitCatalog::rememberLicenseCategory($data['category'] ?? null);
                $serviceType = UnitCatalog::rememberServiceType($data['service_type'] ?? null);
                $responsible = UnitCatalog::rememberResponsiblePerson($data['responsible_person'] ?? null);

                if ($vehicleType) {
                    $data['vehicle_type'] = $vehicleType->name;
                }

                if ($category) {
                    $data['category'] = $category->name;
                }

                if ($serviceType) {
                    $data['service_type'] = $serviceType->name;
                }

                if ($responsible) {
                    $data['responsible_person'] = $responsible->name;
                }

                $attributes = $this->presentAttributes($data);
                $attributes['plate_number'] = $data['plate_number'];

                if ($unitId) {
                    $unit = Unit::query()->findOrFail($unitId);
                    $unit->fill($attributes);
                    $unit->save();
                    $updated++;

                    continue;
                }

                Unit::create([
                    ...$attributes,
                    'period_id' => $period->id,
                ]);
                $created++;
            }
        });

        return [
            'imported' => $created + $updated,
            'created' => $created,
            'updated' => $updated,
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
     * @param  \Illuminate\Support\Collection<int, \App\Models\User>  $coordinators
     * @return array{data: array<string, mixed>, errors: list<string>}
     */
    private function mapRow(array $row, int $excelRow, $coordinators): array
    {
        $correlative = $this->stringValue($row[0] ?? null);
        $phone = $this->stringValue($row[1] ?? null);
        $provider = $this->stringValue($row[2] ?? null);
        $route = $this->stringValue($row[3] ?? null);
        $vehicleType = $this->stringValue($row[4] ?? null);
        $rawDate = $row[5] ?? null;
        $driverName = $this->stringValue($row[6] ?? null);
        $plateNumber = UnitCatalog::formatPlate($this->stringValue($row[7] ?? null));
        $responsible = $this->stringValue($row[8] ?? null);
        $serviceType = $this->stringValue($row[9] ?? null);
        $ruc = $this->stringValue($row[10] ?? null);
        $driverDni = $this->stringValue($row[11] ?? null);
        $category = $this->stringValue($row[12] ?? null);
        $coordinatorName = $this->stringValue($row[13] ?? null);

        $errors = [];
        $serviceDate = null;
        $coordinatorId = null;

        if ($plateNumber === null) {
            $errors[] = 'La PLACA es obligatoria. Con ella se identifica la unidad.';
        }

        if ($this->hasValue($rawDate)) {
            $parsed = $this->parseDate($rawDate);

            if ($parsed === null) {
                $errors[] = 'La FECHA debe tener el formato dd/mm/yyyy.';
            } else {
                $serviceDate = $parsed;
            }
        }

        if ($coordinatorName !== null) {
            $resolved = $this->resolveCoordinator($coordinatorName, $coordinators);

            if ($resolved['error'] !== null) {
                $errors[] = $resolved['error'];
            } else {
                $coordinatorId = $resolved['id'];
            }
        }

        if ($errors !== []) {
            return ['data' => [], 'errors' => $errors];
        }

        $payload = [
            'correlative' => $correlative,
            'phone' => $phone,
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
            'coordinator_id' => $coordinatorId,
        ];

        $validator = Validator::make($payload, [
            'correlative' => ['nullable', 'string', 'max:50'],
            'phone' => ['nullable', 'string', 'max:20'],
            'provider' => ['nullable', 'string', 'max:255'],
            'route' => ['nullable', 'string', 'max:255'],
            'vehicle_type' => ['nullable', 'string', 'max:100'],
            'service_date' => ['nullable', 'date'],
            'driver_name' => ['nullable', 'string', 'max:255'],
            'plate_number' => ['required', 'regex:/^[A-Z0-9]{3}-[A-Z0-9]{3}$/'],
            'responsible_person' => ['nullable', 'string', 'max:255'],
            'service_type' => ['nullable', 'string', 'max:100'],
            'ruc' => ['nullable', 'string', 'regex:/^\d{11}$/'],
            'driver_dni' => ['nullable', 'string', 'max:20', 'regex:/^\d+$/'],
            'category' => ['nullable', 'string', 'max:100'],
            'coordinator_id' => ['nullable', 'integer'],
        ], [
            'ruc.regex' => 'El campo RUC debe tener 11 dígitos.',
            'driver_dni.regex' => 'El campo DNI CONDUCTOR solo debe contener números.',
            'plate_number.required' => 'La PLACA es obligatoria. Con ella se identifica la unidad.',
            'plate_number.regex' => 'El campo PLACA debe ser 3 caracteres, un guion y 3 más. Ejemplo: T5M-121.',
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

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function presentAttributes(array $data): array
    {
        $attributes = [];

        foreach ($data as $key => $value) {
            if ($value === null || $value === '') {
                continue;
            }

            $attributes[$key] = $value;
        }

        return $attributes;
    }

    /**
     * @param  \Illuminate\Support\Collection<int, \App\Models\User>  $coordinators
     * @return array{id: int|null, error: string|null}
     */
    private function resolveCoordinator(string $name, $coordinators): array
    {
        $tokens = preg_split('/[\s,]+/u', mb_strtolower(trim($name))) ?: [];
        $tokens = array_values(array_filter(
            $tokens,
            fn ($token) => mb_strlen((string) $token) >= 3,
        ));

        if ($tokens === []) {
            return [
                'id' => null,
                'error' => "El COORDINADOR \"{$name}\" no se puede identificar.",
            ];
        }

        $matches = $coordinators->filter(function ($user) use ($tokens) {
            $haystack = mb_strtolower((string) $user->name);

            foreach ($tokens as $token) {
                if (! str_contains($haystack, $token)) {
                    return false;
                }
            }

            return true;
        })->values();

        if ($matches->count() === 1) {
            return [
                'id' => (int) $matches->first()->id,
                'error' => null,
            ];
        }

        if ($matches->isEmpty()) {
            return [
                'id' => null,
                'error' => "El COORDINADOR \"{$name}\" no coincide con ningún coordinador.",
            ];
        }

        $names = $matches->pluck('name')->implode(', ');

        return [
            'id' => null,
            'error' => "El COORDINADOR \"{$name}\" coincide con varios usuarios: {$names}.",
        ];
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
