<?php

namespace App\Support;

use App\Models\Induction;
use App\Models\InductionAttendee;
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
     */
    public function download(Collection $inductions): StreamedResponse
    {
        foreach ($inductions as $induction) {
            foreach ($induction->attendees as $attendee) {
                $attendee->setRelation('induction', $induction);
            }
        }

        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('Agrovision')
            ->setTitle('Reporte de capacitación')
            ->setSubject('Participación de conductores en inducciones');

        $this->writeSummary($spreadsheet->getActiveSheet(), $inductions);
        $this->writeInductions($spreadsheet->createSheet(), $inductions);
        $this->writeParticipations($spreadsheet->createSheet(), $inductions);
        $this->writeDrivers($spreadsheet->createSheet(), $inductions);
        $spreadsheet->setActiveSheetIndex(0);

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
     */
    private function writeSummary(Worksheet $sheet, Collection $inductions): void
    {
        $sheet->setTitle('Resumen');
        $attendees = $inductions->flatMap(fn (Induction $induction) => $induction->attendees);
        $attended = $attendees->where('status', InductionAttendeeStatuses::ATTENDED);
        $absent = $attendees->where('status', InductionAttendeeStatuses::ABSENT);
        $registered = $attendees->where('status', InductionAttendeeStatuses::REGISTERED);
        $drivers = $this->groupDrivers($attendees);
        $trained = $drivers->filter(fn (array $driver) => $driver['attended'] > 0);
        $closed = $inductions->where('status', InductionStatuses::CLOSED);
        $closedAttended = $closed->sum(fn (Induction $induction) => $induction->attendees
            ->where('status', InductionAttendeeStatuses::ATTENDED)
            ->count());

        $sheet->setCellValue('A1', 'Reporte de capacitación');
        $sheet->mergeCells('A1:B1');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16)->getColor()->setRGB('1A2B4C');
        $sheet->setCellValue('A2', 'Generado');
        $sheet->setCellValue('B2', now()->timezone(config('app.timezone'))->format('d/m/Y H:i'));

        $rows = [
            ['Capacitaciones', $inductions->count()],
            ['Programadas', $inductions->where('status', InductionStatuses::SCHEDULED)->count()],
            ['En curso', $inductions->where('status', InductionStatuses::IN_PROGRESS)->count()],
            ['Cerradas', $closed->count()],
            ['Canceladas', $inductions->where('status', InductionStatuses::CANCELLED)->count()],
            ['Convocados', $attendees->count()],
            ['Asistieron', $attended->count()],
            ['No asistieron', $absent->count()],
            ['Aún inscritos', $registered->count()],
            ['% de asistencia', $this->percent($attended->count(), $attendees->count())],
            ['Conductores distintos', $drivers->count()],
            ['Conductores con al menos una asistencia', $trained->count()],
            ['Conductores sin ninguna asistencia', $drivers->count() - $trained->count()],
            ['Firmas de conductores', $attendees->filter(fn (InductionAttendee $attendee) => $attendee->signed_at !== null)->count()],
            ['Promedio de asistentes por capacitación cerrada', $closed->isEmpty() ? 0 : round($closedAttended / $closed->count(), 1)],
        ];

        $start = 4;
        foreach ($rows as $index => $row) {
            $sheet->setCellValue([1, $start + $index], $row[0]);
            $sheet->setCellValue([2, $start + $index], $row[1]);
        }
        $sheet->getStyle('A4:A'.($start + count($rows) - 1))->getFont()->setBold(true);
        $sheet->getStyle('A4:B'.($start + count($rows) - 1))->applyFromArray([
            'borders' => [
                'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D7E3F0']],
            ],
        ]);

        $topicRow = $start + count($rows) + 2;
        $sheet->setCellValue([1, $topicRow], 'Temas con más asistentes');
        $sheet->getStyle([1, $topicRow])->getFont()->setBold(true)->setSize(13)->getColor()->setRGB('1A2B4C');
        $headers = ['Capacitación', 'Fecha', 'Asistieron', 'Convocados', '% asistencia'];
        $this->writeHeader($sheet, $headers, $topicRow + 1);

        $ranked = $inductions
            ->sortByDesc(fn (Induction $induction) => $induction->attendees
                ->where('status', InductionAttendeeStatuses::ATTENDED)
                ->count())
            ->take(10)
            ->values();

        foreach ($ranked as $index => $induction) {
            $row = $topicRow + 2 + $index;
            $convoked = $induction->attendees->count();
            $came = $induction->attendees->where('status', InductionAttendeeStatuses::ATTENDED)->count();
            $sheet->setCellValue([1, $row], $induction->title);
            $sheet->setCellValue([2, $row], $this->when($induction));
            $sheet->setCellValue([3, $row], $came);
            $sheet->setCellValue([4, $row], $convoked);
            $sheet->setCellValue([5, $row], $this->percent($came, $convoked));
        }

        $sheet->getColumnDimension('A')->setWidth(52);
        $sheet->getColumnDimension('B')->setWidth(28);
        $sheet->getColumnDimension('C')->setWidth(16);
        $sheet->getColumnDimension('D')->setWidth(16);
        $sheet->getColumnDimension('E')->setWidth(16);
    }

    /**
     * @param  Collection<int, Induction>  $inductions
     */
    private function writeInductions(Worksheet $sheet, Collection $inductions): void
    {
        $sheet->setTitle('Capacitaciones');
        $headers = [
            'Acta', 'Título', 'Fecha', 'Estado', 'Sede', 'Lugar', 'Expositor', 'Periodo',
            'Convocados', 'Asistieron', 'No asistieron', 'Inscritos', 'Firmados', '% asistencia',
        ];
        $this->writeHeader($sheet, $headers, 1);

        foreach ($inductions->sortByDesc('scheduled_at')->values() as $index => $induction) {
            $row = $index + 2;
            $attendees = $induction->attendees;
            $came = $attendees->where('status', InductionAttendeeStatuses::ATTENDED)->count();
            $sheet->fromArray([
                $induction->acta_number ?: str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT),
                $induction->title,
                $this->when($induction),
                InductionStatuses::label((string) $induction->status),
                $induction->sede,
                $induction->location,
                $induction->speaker_name,
                $induction->period?->name,
                $attendees->count(),
                $came,
                $attendees->where('status', InductionAttendeeStatuses::ABSENT)->count(),
                $attendees->where('status', InductionAttendeeStatuses::REGISTERED)->count(),
                $attendees->filter(fn (InductionAttendee $attendee) => $attendee->signed_at !== null)->count(),
                $this->percent($came, $attendees->count()),
            ], null, 'A'.$row);
        }

        $this->finishTable($sheet, count($headers), $inductions->count() + 1);
    }

    /**
     * @param  Collection<int, Induction>  $inductions
     */
    private function writeParticipations(Worksheet $sheet, Collection $inductions): void
    {
        $sheet->setTitle('Participaciones');
        $headers = [
            'Conductor', 'DNI', 'Placa', 'Proveedor', 'Capacitación', 'Acta', 'Fecha',
            'Estado de la capacitación', 'Asistencia', 'Firmó',
        ];
        $this->writeHeader($sheet, $headers, 1);
        $row = 2;

        foreach ($inductions->sortByDesc('scheduled_at') as $induction) {
            foreach ($induction->attendees->sortBy('driver_name') as $attendee) {
                $sheet->fromArray([
                    $attendee->driver_name,
                    $attendee->driver_dni,
                    $attendee->plate_number,
                    $attendee->provider,
                    $induction->title,
                    $induction->acta_number ?: str_pad((string) $induction->id, 6, '0', STR_PAD_LEFT),
                    $this->when($induction),
                    InductionStatuses::label((string) $induction->status),
                    InductionAttendeeStatuses::label((string) $attendee->status),
                    $attendee->signed_at !== null ? 'Sí' : 'No',
                ], null, 'A'.$row);
                $row++;
            }
        }

        $this->finishTable($sheet, count($headers), max(1, $row - 1));
    }

    /**
     * @param  Collection<int, Induction>  $inductions
     */
    private function writeDrivers(Worksheet $sheet, Collection $inductions): void
    {
        $sheet->setTitle('Por conductor');
        $headers = [
            'Conductor', 'DNI', 'Placa', 'Proveedor', 'Convocado', 'Asistió', 'No asistió',
            '% asistencia', 'Última asistencia', 'Capacitaciones a las que asistió',
        ];
        $this->writeHeader($sheet, $headers, 1);

        $drivers = $this->groupDrivers($inductions->flatMap(fn (Induction $induction) => $induction->attendees))
            ->sortBy('name')
            ->values();

        foreach ($drivers as $index => $driver) {
            $sheet->fromArray([
                $driver['name'],
                $driver['dni'],
                $driver['plate'],
                $driver['provider'],
                $driver['convoked'],
                $driver['attended'],
                $driver['absent'],
                $this->percent($driver['attended'], $driver['convoked']),
                $driver['last_attended'],
                $driver['topics'],
            ], null, 'A'.($index + 2));
        }

        $this->finishTable($sheet, count($headers), $drivers->count() + 1);
        $sheet->getColumnDimension('J')->setWidth(60);
    }

    /**
     * @param  Collection<int, InductionAttendee>  $attendees
     * @return Collection<string, array{name: string, dni: string, plate: string, provider: string, convoked: int, attended: int, absent: int, last_attended: string, topics: string}>
     */
    private function groupDrivers(Collection $attendees): Collection
    {
        /** @var Collection<string, array{name: string, dni: string, plate: string, provider: string, convoked: int, attended: int, absent: int, last_at: int, last_attended: string, topics: list<string>}> $grouped */
        $grouped = collect();

        foreach ($attendees as $attendee) {
            $dni = preg_replace('/\D+/', '', (string) $attendee->driver_dni) ?: '';
            $key = $dni !== '' ? 'd:'.$dni : 'n:'.mb_strtoupper(trim($attendee->driver_name));
            $current = $grouped->get($key, [
                'name' => $attendee->driver_name,
                'dni' => $attendee->driver_dni ?? '',
                'plate' => $attendee->plate_number ?? '',
                'provider' => $attendee->provider ?? '',
                'convoked' => 0,
                'attended' => 0,
                'absent' => 0,
                'last_at' => 0,
                'last_attended' => '',
                'topics' => [],
            ]);
            $current['convoked']++;

            if ($attendee->status === InductionAttendeeStatuses::ATTENDED) {
                $current['attended']++;
                $title = trim((string) ($attendee->induction?->title ?? ''));
                if ($title !== '' && ! in_array($title, $current['topics'], true)) {
                    $current['topics'][] = $title;
                }
                $at = $attendee->induction?->scheduled_at?->getTimestamp() ?? 0;
                if ($at >= $current['last_at']) {
                    $current['last_at'] = $at;
                    $current['last_attended'] = $this->when($attendee->induction);
                }
            } elseif ($attendee->status === InductionAttendeeStatuses::ABSENT) {
                $current['absent']++;
            }

            $grouped->put($key, $current);
        }

        return $grouped->map(function (array $driver) {
            $driver['topics'] = implode(' · ', $driver['topics']);
            unset($driver['last_at']);

            return $driver;
        });
    }

    private function when(?Induction $induction): string
    {
        return $induction?->scheduled_at
            ?->timezone(config('app.timezone'))
            ->format('d/m/Y H:i') ?? '';
    }

    private function percent(int $part, int $total): string
    {
        if ($total === 0) {
            return '0%';
        }

        return round(($part / $total) * 100, 1).'%';
    }

    /**
     * @param  list<string>  $headers
     */
    private function writeHeader(Worksheet $sheet, array $headers, int $row): void
    {
        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, $row], $header);
        }

        $last = $this->columnLetter(count($headers));
        $sheet->getStyle("A{$row}:{$last}{$row}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A2B4C']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(22);
        $sheet->freezePane('A'.($row + 1));
    }

    private function finishTable(Worksheet $sheet, int $columns, int $lastRow): void
    {
        $last = $this->columnLetter($columns);
        $sheet->setAutoFilter("A1:{$last}{$lastRow}");

        for ($column = 1; $column <= $columns; $column++) {
            $sheet->getColumnDimension($this->columnLetter($column))->setWidth(22);
        }

        $sheet->getColumnDimension('B')->setWidth(36);
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
