<?php

namespace App\Support;

use App\Models\GpsMovement;
use App\Models\GpsRecord;
use App\Models\Period;
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

final class GpsExcelImporter
{
    /** @var list<string> */
    private const HEADERS = [
        'FECHA DE INSTALACIÓN',
        'IMEI',
        'PLACA',
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

        $split = FleetExcelSupport::splitHeaderAndBody($rows, ['placa', 'imei']);
        $headers = $split['header'];
        $plateIndex = FleetExcelSupport::headerIndex($headers, 'placa');
        $imeiIndex = FleetExcelSupport::headerIndex($headers, 'imei');
        $installedIndex = FleetExcelSupport::headerIndex($headers, 'fecha de instalacion');

        if ($plateIndex === null) {
            return $this->errorResult(1, ['No se encontró la columna PLACA en el archivo.']);
        }

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

            $imei = preg_replace('/\D+/', '', (string) FleetExcelSupport::cellValue($row, $imeiIndex)) ?: null;

            $pending[$plate] = [
                'plate_number' => $plate,
                'imei' => $imei,
                'installed_on' => FleetExcelSupport::parseDate(
                    $row[$installedIndex ?? -1] ?? null,
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
                $record = GpsRecord::query()->firstOrCreate(
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
                    GpsStatusHistory::record($record->id, 'active', $data['service_date'], 'import');
                }

                $movement = GpsMovement::query()->updateOrCreate(
                    [
                        'period_id' => $period->id,
                        'plate_number' => $data['plate_number'],
                        'service_date' => $data['service_date'],
                    ],
                    [
                        'gps_record_id' => $record->id,
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

            $missing = GpsRecord::query()
                ->where('period_id', $period->id)
                ->whereNotIn('id', $presentIds);

            $returning = (clone $missing)->where(function ($query): void {
                $query->where('status', '!=', 'inactive')->orWhereNull('status');
            })->pluck('id');

            $deactivated = $missing->update(['status' => 'inactive']);
            $today = now()->toDateString();

            foreach ($returning as $recordId) {
                GpsStatusHistory::record((int) $recordId, 'inactive', $today, 'import');
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
     * @param  Collection<int, GpsRecord>|Collection<int, GpsMovement>  $rows
     */
    public function export(Collection $rows, string $filename, bool $history = false): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($history ? 'Historial GPS' : 'GPS');

        $headers = $history
            ? array_merge(['Fecha carga'], self::HEADERS)
            : self::HEADERS;

        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 1], $header);
        }

        $sheet->getStyle('A1:C1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1A2B4C'],
            ],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        $rowNumber = 2;

        foreach ($rows as $row) {
            $col = 1;
            if ($history && $row instanceof GpsMovement) {
                $sheet->setCellValue([$col++, $rowNumber], $this->asExcelDate($row->service_date));
                $this->writeGpsRow($sheet, $rowNumber, $col, $row);
            } elseif (! $history && $row instanceof GpsRecord) {
                $this->writeGpsRow($sheet, $rowNumber, $col, $row);
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
        return $this->export(collect(), 'plantilla-gps.xlsx');
    }

    /**
     * @param  GpsRecord|GpsMovement  $row
     */
    private function writeGpsRow(
        \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet,
        int $rowNumber,
        int $startCol,
        GpsRecord|GpsMovement $row,
    ): void {
        $installed = $this->asExcelDate($row->installed_on);
        $coordinate = [$startCol, $rowNumber];
        if ($installed instanceof \DateTimeInterface) {
            $sheet->setCellValue($coordinate, ExcelDate::PHPToExcel($installed));
            $sheet->getStyle($coordinate)->getNumberFormat()->setFormatCode('DD/MM/YYYY');
        } else {
            $sheet->setCellValue($coordinate, null);
        }

        $sheet->setCellValueExplicit(
            [$startCol + 1, $rowNumber],
            (string) ($row->imei ?? ''),
            \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING,
        );
        $sheet->setCellValue([$startCol + 2, $rowNumber], $row->plate_number);
    }

    private function asExcelDate(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return $value;
        }

        $parsed = FleetExcelSupport::parseDate($value);

        return $parsed ? \Illuminate\Support\Carbon::parse($parsed) : null;
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
