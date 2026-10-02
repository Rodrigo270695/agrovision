<?php

namespace App\Support;

use App\Models\Induction;
use App\Models\Unit;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class InductionReportExporter
{
    /**
     * @param  Collection<int, Induction>  $inductions
     * @param  Collection<int, Unit>  $units
     */
    public function download(Collection $inductions, Collection $units): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('Agrovision')
            ->setTitle('Reporte de capacitación')
            ->setSubject('Cumplimiento de capacitaciones por conductor');

        $this->writeMatrix($spreadsheet->getActiveSheet(), $inductions, $units);

        $filename = 'capacitacion_reporte_'.now()->timezone(config('app.timezone'))->format('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet): void {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  Collection<int, Induction>  $inductions
     * @param  Collection<int, Unit>  $units
     */
    private function writeMatrix(Worksheet $sheet, Collection $inductions, Collection $units): void
    {
        $sheet->setTitle('Capacitaciones');

        $topics = $this->topics($inductions);
        $attended = $this->attendance($inductions);
        $drivers = $this->drivers($units)->sortBy('name')->values();

        $headers = [
            'N°',
            'FECHA DE INGRESO',
            'DNI',
            'CONDUCTOR',
            'PLACA',
            'PROVEEDOR',
            'RESPONSABLE DEL COORDINADOR',
            'SEDE',
            'FECHA',
            'ESTATUS',
        ];

        foreach ($topics as $topic) {
            $headers[] = $topic['label'];
        }

        $headers[] = 'PORCENTAJE DE CUMPLIMIENTO';
        $this->writeHeader($sheet, $headers);

        $topicCount = count($topics);
        $firstTopicColumn = 11;
        $percentColumn = $firstTopicColumn + $topicCount;

        foreach ($drivers as $index => $driver) {
            $row = $index + 2;
            $ok = 0;

            $sheet->fromArray([
                $index + 1,
                $driver['ingreso'],
                $driver['dni'],
                $driver['name'],
                $driver['plate'],
                $driver['provider'],
                $driver['coordinator'],
                $driver['sede'],
                $driver['fecha'],
                $driver['status'],
            ], null, 'A'.$row);

            $this->paintStatus($sheet, $row, $driver['status']);

            foreach (array_values($topics) as $topicIndex => $topic) {
                $column = $firstTopicColumn + $topicIndex;
                $didAttend = isset($attended[$driver['key']][$topic['key']]);
                $sheet->setCellValue([$column, $row], $didAttend ? 'OK' : '');

                if ($didAttend) {
                    $ok++;
                    $this->paintOk($sheet, $column, $row);
                }
            }

            $sheet->setCellValue(
                [$percentColumn, $row],
                $topicCount === 0 ? '0%' : round(($ok / $topicCount) * 100).'%',
            );
            $sheet->getStyle([$percentColumn, $row])->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER);
        }

        $lastRow = max(1, $drivers->count() + 1);
        $lastColumn = $this->columnLetter(count($headers));
        $sheet->setAutoFilter("A1:{$lastColumn}{$lastRow}");
        $sheet->getStyle("A1:{$lastColumn}{$lastRow}")->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);

        if ($drivers->isNotEmpty()) {
            $sheet->getStyle("A2:{$lastColumn}{$lastRow}")->applyFromArray([
                'borders' => [
                    'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D7E3F0']],
                ],
            ]);
        }

        $widths = [6, 20, 14, 38, 14, 28, 34, 22, 16, 14];
        foreach ($widths as $index => $width) {
            $sheet->getColumnDimension($this->columnLetter($index + 1))->setWidth($width);
        }

        for ($column = $firstTopicColumn; $column <= $percentColumn; $column++) {
            $sheet->getColumnDimension($this->columnLetter($column))->setWidth($column === $percentColumn ? 18 : 24);
        }
    }

    /**
     * @param  Collection<int, Induction>  $inductions
     * @return array<string, array{key: string, label: string}>
     */
    private function topics(Collection $inductions): array
    {
        $topics = [];

        foreach ($inductions->sortBy(fn (Induction $induction) => $induction->scheduled_at?->getTimestamp() ?? 0) as $induction) {
            $label = trim((string) $induction->title);
            if ($label === '') {
                continue;
            }

            $key = mb_strtoupper($label);
            if (! isset($topics[$key])) {
                $topics[$key] = ['key' => $key, 'label' => mb_strtoupper($label)];
            }
        }

        return $topics;
    }

    /**
     * @param  Collection<int, Induction>  $inductions
     * @return array<string, array<string, true>>
     */
    private function attendance(Collection $inductions): array
    {
        $attended = [];

        foreach ($inductions as $induction) {
            $topic = mb_strtoupper(trim((string) $induction->title));
            if ($topic === '') {
                continue;
            }

            foreach ($induction->attendees as $attendee) {
                if ($attendee->status !== InductionAttendeeStatuses::ATTENDED) {
                    continue;
                }

                $key = $this->driverKey($attendee->driver_dni, $attendee->driver_name);
                if ($key === '') {
                    continue;
                }

                $attended[$key][$topic] = true;
            }
        }

        return $attended;
    }

    /**
     * @param  Collection<int, Unit>  $units
     * @return Collection<string, array{key: string, name: string, dni: string, plate: string, provider: string, coordinator: string, sede: string, ingreso: string, fecha: string, status: string, stamp: int, ingreso_stamp: int}>
     */
    private function drivers(Collection $units): Collection
    {
        /** @var Collection<string, array{key: string, name: string, dni: string, plate: string, provider: string, coordinator: string, sede: string, ingreso: string, fecha: string, status: string, stamp: int, ingreso_stamp: int}> $drivers */
        $drivers = collect();

        foreach ($units as $unit) {
            $key = $this->driverKey($unit->driver_dni, $unit->driver_name);
            if ($key === '') {
                continue;
            }

            $stamp = $unit->period?->date?->getTimestamp()
                ?? $unit->service_date?->getTimestamp()
                ?? $unit->created_at?->getTimestamp()
                ?? 0;
            $ingresoStamp = $unit->service_date?->getTimestamp()
                ?? $unit->created_at?->getTimestamp()
                ?? $stamp;
            $ingresoLabel = $unit->service_date?->format('d/m/Y')
                ?? $unit->created_at?->timezone(config('app.timezone'))->format('d/m/Y')
                ?? '';
            $current = $drivers->get($key);

            if ($current === null || $stamp >= $current['stamp']) {
                $drivers->put($key, [
                    'key' => $key,
                    'name' => trim((string) $unit->driver_name),
                    'dni' => trim((string) $unit->driver_dni),
                    'plate' => trim((string) $unit->plate_number),
                    'provider' => trim((string) $unit->provider),
                    'coordinator' => trim((string) ($unit->coordinatorUser?->name ?? '')),
                    'sede' => $this->sede($unit),
                    'ingreso' => $current === null || $ingresoStamp <= $current['ingreso_stamp']
                        ? $ingresoLabel
                        : $current['ingreso'],
                    'fecha' => $unit->service_date?->format('d/m/Y') ?? '',
                    'status' => $unit->period?->isActive() ? 'ACTIVO' : 'INACTIVO',
                    'stamp' => $stamp,
                    'ingreso_stamp' => $current === null
                        ? $ingresoStamp
                        : min($ingresoStamp, $current['ingreso_stamp']),
                ]);

                continue;
            }

            if ($ingresoStamp < $current['ingreso_stamp']) {
                $current['ingreso'] = $ingresoLabel;
                $current['ingreso_stamp'] = $ingresoStamp;
                $drivers->put($key, $current);
            }
        }

        return $drivers;
    }

    private function sede(Unit $unit): string
    {
        $sites = $unit->coordinatorUser?->places
            ->map(fn ($place) => trim((string) ($place->site?->name ?? '')))
            ->filter()
            ->unique()
            ->values() ?? collect();

        return $sites->implode(' / ');
    }

    private function driverKey(?string $dni, ?string $name): string
    {
        $digits = preg_replace('/\D+/', '', (string) $dni) ?: '';
        if ($digits !== '') {
            return 'd:'.$digits;
        }

        $normalized = mb_strtoupper(trim((string) $name));

        return $normalized !== '' ? 'n:'.$normalized : '';
    }

    /**
     * @param  list<string>  $headers
     */
    private function writeHeader(Worksheet $sheet, array $headers): void
    {
        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 1], $header);
        }

        $last = $this->columnLetter(count($headers));
        $sheet->getStyle("A1:{$last}1")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A2B4C']],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(32);
        $sheet->freezePane('A2');
    }

    private function paintOk(Worksheet $sheet, int $column, int $row): void
    {
        $sheet->getStyle([$column, $row])->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => '14532D']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '22C55E']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
    }

    private function paintStatus(Worksheet $sheet, int $row, string $status): void
    {
        $active = $status === 'ACTIVO';
        $sheet->getStyle([10, $row])->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => $active ? '14532D' : '7F1D1D']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => $active ? '22C55E' : 'FECACA']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
    }

    private function columnLetter(int $index): string
    {
        $letter = '';

        while ($index > 0) {
            $index--;
            $letter = chr(65 + ($index % 26)).$letter;
            $index = intdiv($index, 26);
        }

        return $letter;
    }
}
