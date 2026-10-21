<?php

namespace App\Support;

use App\Models\Period;
use App\Models\RcInsurance;
use App\Models\RcInsuranceMovement;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class RcInsuranceExcelImporter
{
    /** @var list<string> */
    private const HEADERS = [
        'N°',
        'Clase de la unidad',
        'Tipo de la unidad',
        'Placa',
        'Uso',
        'CONDICION',
        'SUP. TDP',
        'TRAMITE',
        'FECHA ACTIVACION',
        'FECHA VENCIMIENTO',
    ];

    /**
     * @return array{imported: int, created: int, updated: int, records_created: int, deactivated: int, errors: list<array{row: int, messages: list<string>}>}
     */
    public function import(UploadedFile $file, Period $period): array
    {
        set_time_limit(300);

        $sheet = IOFactory::load($file->getRealPath())->getActiveSheet();
        $rows = $sheet->toArray(null, true, false, false);

        if ($rows === []) {
            return $this->errorResult(1, ['El archivo está vacío.']);
        }

        $split = FleetExcelSupport::splitHeaderAndBody($rows, ['placa']);
        $headers = $split['header'];
        $plateIndex = FleetExcelSupport::headerIndex($headers, 'placa');

        if ($plateIndex === null) {
            return $this->errorResult(1, ['No se encontró la columna Placa en el archivo.']);
        }

        $indexes = [
            'unit_class' => FleetExcelSupport::headerIndex($headers, 'clase de la unidad'),
            'vehicle_type' => FleetExcelSupport::headerIndex($headers, 'tipo de la unidad'),
            'usage' => FleetExcelSupport::headerIndex($headers, 'uso'),
            'condition_flag' => FleetExcelSupport::headerIndex($headers, 'condicion'),
            'supervisor_tdp' => FleetExcelSupport::headerIndex($headers, 'sup. tdp'),
            'procedure' => FleetExcelSupport::headerIndex($headers, 'tramite'),
            'activated_on' => FleetExcelSupport::headerIndex($headers, 'fecha activacion'),
            'expires_on' => FleetExcelSupport::headerIndex($headers, 'fecha vencimiento'),
        ];

        $serviceDate = now()->timezone(config('app.timezone'))->toDateString();
        $pending = [];
        $errors = [];
        $headerRow = $split['header_row'];

        foreach ($split['body'] as $index => $row) {
            $excelRow = $headerRow + $index + 1;

            if (FleetExcelSupport::rowIsEmpty($row)) {
                continue;
            }

            $plate = FleetExcelSupport::normalizePlate(
                FleetExcelSupport::cellValue($row, $plateIndex),
            );

            if ($plate === '') {
                $errors[] = [
                    'row' => $excelRow,
                    'messages' => ['La placa es obligatoria.'],
                ];

                continue;
            }

            $pending[$plate] = [
                'plate_number' => $plate,
                'unit_class' => FleetExcelSupport::cellValue($row, $indexes['unit_class']),
                'vehicle_type' => FleetExcelSupport::cellValue($row, $indexes['vehicle_type']),
                'usage' => FleetExcelSupport::cellValue($row, $indexes['usage']),
                'condition_flag' => FleetExcelSupport::cellValue($row, $indexes['condition_flag']),
                'supervisor_tdp' => FleetExcelSupport::cellValue($row, $indexes['supervisor_tdp']),
                'procedure' => FleetExcelSupport::cellValue($row, $indexes['procedure']),
                'activated_on' => FleetExcelSupport::parseDate(
                    $row[$indexes['activated_on'] ?? -1] ?? null,
                ),
                'expires_on' => FleetExcelSupport::parseDate(
                    $row[$indexes['expires_on'] ?? -1] ?? null,
                ),
                'service_date' => $serviceDate,
            ];
        }

        if ($pending === []) {
            return $this->errorResult(
                $headerRow + 1,
                $errors !== [] ? [] : ['No se encontraron filas con datos para importar.'],
                $errors,
            );
        }

        if ($errors !== []) {
            return [
                'imported' => 0,
                'created' => 0,
                'updated' => 0,
                'records_created' => 0,
                'deactivated' => 0,
                'errors' => array_values($errors),
            ];
        }

        $created = 0;
        $updated = 0;
        $recordsCreated = 0;
        $deactivated = 0;

        DB::transaction(function () use ($period, $pending, &$created, &$updated, &$recordsCreated, &$deactivated): void {
            $presentIds = [];

            foreach ($pending as $data) {
                $record = RcInsurance::query()->firstOrCreate(
                    [
                        'period_id' => $period->id,
                        'plate_number' => $data['plate_number'],
                    ],
                    ['status' => 'active'],
                );

                if ($record->wasRecentlyCreated) {
                    $recordsCreated++;
                }

                $previous = $record->status ?: 'active';
                $record->fill([...$data, 'status' => 'active']);
                $record->save();

                if ($previous !== 'active') {
                    RcInsuranceStatusHistory::record($record->id, 'active', $data['service_date'], 'import');
                }

                $movement = RcInsuranceMovement::query()->updateOrCreate(
                    [
                        'period_id' => $period->id,
                        'plate_number' => $data['plate_number'],
                        'service_date' => $data['service_date'],
                    ],
                    [
                        'rc_insurance_id' => $record->id,
                        ...$data,
                    ],
                );

                if ($movement->wasRecentlyCreated) {
                    $created++;
                } else {
                    $updated++;
                }

                $presentIds[] = $record->id;
            }

            if ($presentIds === []) {
                return;
            }

            $missing = RcInsurance::query()
                ->where('period_id', $period->id)
                ->whereNotIn('id', $presentIds);

            $returning = (clone $missing)->where(function ($query): void {
                $query->where('status', '!=', 'inactive')->orWhereNull('status');
            })->pluck('id');

            $deactivated = $missing->update(['status' => 'inactive']);
            $today = now()->toDateString();

            foreach ($returning as $recordId) {
                RcInsuranceStatusHistory::record((int) $recordId, 'inactive', $today, 'import');
            }
        });

        return [
            'imported' => count($pending),
            'created' => $created,
            'updated' => $updated,
            'records_created' => $recordsCreated,
            'deactivated' => $deactivated,
            'errors' => array_values($errors),
        ];
    }

    /**
     * @param  Collection<int, RcInsurance>|Collection<int, RcInsuranceMovement>  $rows
     */
    public function export(Collection $rows, string $filename, bool $history = false): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($history ? 'Historial RC' : 'Seguro RC');

        $headers = $history
            ? array_merge(['Fecha carga'], self::HEADERS)
            : self::HEADERS;

        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 1], $header);
        }

        $sheet->getStyle('A1:J1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1A2B4C'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        $rowNumber = 2;
        $sequence = 1;

        foreach ($rows as $row) {
            $col = 1;
            if ($history && $row instanceof RcInsuranceMovement) {
                $sheet->setCellValue([$col++, $rowNumber], $this->excelDate($row->service_date));
                $this->writeDataRow($sheet, $rowNumber, $col, $row, $sequence++);
            } elseif (! $history && $row instanceof RcInsurance) {
                $this->writeDataRow($sheet, $rowNumber, $col, $row, $sequence++);
            }

            $rowNumber++;
        }

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer): void {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function downloadTemplate(): StreamedResponse
    {
        return $this->export(collect(), 'plantilla-seguro-rc.xlsx');
    }

    /**
     * @param  RcInsurance|RcInsuranceMovement  $row
     */
    private function writeDataRow(
        \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet,
        int $rowNumber,
        int $startCol,
        RcInsurance|RcInsuranceMovement $row,
        int $sequence,
    ): void {
        $values = [
            $sequence,
            $row->unit_class,
            $row->vehicle_type,
            $row->plate_number,
            $row->usage,
            $row->condition_flag,
            $row->supervisor_tdp,
            $row->procedure,
            $this->excelDate($row->activated_on),
            $this->excelDate($row->expires_on),
        ];

        foreach ($values as $offset => $value) {
            $coordinate = [$startCol + $offset, $rowNumber];
            if ($value instanceof \DateTimeInterface) {
                $sheet->setCellValue($coordinate, ExcelDate::PHPToExcel($value));
                $sheet->getStyle($coordinate)->getNumberFormat()->setFormatCode('DD/MM/YYYY');

                continue;
            }

            $sheet->setCellValue($coordinate, $value);
        }
    }

    private function excelDate(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value;
        }

        return FleetExcelSupport::parseDate($value);
    }

    /**
     * @param  list<string>  $messages
     * @param  list<array{row: int, messages: list<string>}>  $errors
     * @return array{imported: int, created: int, updated: int, records_created: int, deactivated: int, errors: list<array{row: int, messages: list<string>}>}
     */
    private function errorResult(int $row, array $messages, array $errors = []): array
    {
        if ($messages !== []) {
            $errors[] = ['row' => $row, 'messages' => $messages];
        }

        return [
            'imported' => 0,
            'created' => 0,
            'updated' => 0,
            'records_created' => 0,
            'deactivated' => 0,
            'errors' => $errors,
        ];
    }
}
