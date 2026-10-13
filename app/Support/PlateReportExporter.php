<?php

namespace App\Support;

use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class PlateReportExporter
{
    /**
     * @param  list<array<string, mixed>>  $rows
     */
    public function download(array $rows): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('Agrovision')
            ->setTitle('Consulta de placas');

        $this->summary($spreadsheet->getActiveSheet(), $rows);
        $this->findings($spreadsheet->createSheet(), $rows);
        $this->inductions($spreadsheet->createSheet(), $rows);
        $spreadsheet->setActiveSheetIndex(0);

        $filename = 'consulta-placas-'.now()->timezone(config('app.timezone'))->format('Ymd_His').'.xlsx';

        return response()->streamDownload(function () use ($spreadsheet): void {
            $writer = new Xlsx($spreadsheet);
            $writer->save('php://output');
            $spreadsheet->disconnectWorksheets();
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function summary(Worksheet $sheet, array $rows): void
    {
        $sheet->setTitle('Resumen');
        $headers = [
            'Placa',
            'Encontrada',
            'Conductor',
            'DNI',
            'Proveedor',
            'Estado unidad',
            'Coordinador',
            'Documentos',
            'Licencia',
            'DNI doc.',
            'SOAT',
            'Revisión técnica',
            'Tarjeta de propiedad',
            'SCTR',
            '1ra inspección',
            'Fecha 1ra',
            'Observaciones 1ra',
            '2da inspección',
            'Fecha 2da',
            'Observaciones 2da',
            'Subsanada',
            'Firmó',
            'Fecha firma',
            'Inducciones',
        ];
        $this->header($sheet, $headers);

        foreach ($rows as $index => $row) {
            $line = $index + 2;
            $latest = $row['latest'];
            $docs = collect($row['documents'])->keyBy('type');
            $sheet->fromArray([
                $row['plate'],
                $row['found'] ? 'Sí' : 'No',
                $row['driver_name'],
                $row['driver_dni'],
                $row['provider'],
                $row['unit_status'],
                $row['coordinator'],
                $row['docs_done'].'/'.$row['docs_total'],
                $this->docState($docs->get('driver_license')),
                $this->docState($docs->get('driver_dni')),
                $this->docState($docs->get('soat')),
                $this->docState($docs->get('technical_inspection')),
                $this->docState($docs->get('ownership_card')),
                $this->docState($docs->get('sctr')),
                $latest['first_result'] ?? '',
                $latest['first_date'] ?? '',
                implode("\n", $latest['first_failed'] ?? []),
                $latest['second_result'] ?? '',
                $latest['second_date'] ?? '',
                implode("\n", $latest['second_failed'] ?? []),
                $latest === null ? '' : ($latest['subsanada'] ? 'Sí' : 'No'),
                $latest['signer'] ?? '',
                $latest['signed_at'] ?? '',
                collect($row['inductions'])->map(fn (array $item) => trim($item['date'].' '.$item['title']))->implode("\n"),
            ], null, 'A'.$line);
            $sheet->getStyle('A'.$line.':X'.$line)->getAlignment()->setVertical(Alignment::VERTICAL_TOP)->setWrapText(true);
        }

        $this->widths($sheet, [14, 12, 28, 14, 24, 14, 24, 12, 14, 14, 14, 16, 18, 12, 16, 14, 40, 16, 14, 40, 12, 24, 18, 40]);
        $sheet->freezePane('A2');
        $sheet->setAutoFilter('A1:X1');
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function findings(Worksheet $sheet, array $rows): void
    {
        $sheet->setTitle('Observaciones');
        $this->header($sheet, ['Placa', 'Conductor', 'Inspección', 'Fecha', 'Ítem que no pasó']);
        $line = 2;

        foreach ($rows as $row) {
            foreach ($row['inspections'] as $inspection) {
                foreach (['first' => '1ra', 'second' => '2da'] as $pass => $label) {
                    foreach ($inspection[$pass.'_failed'] as $item) {
                        $sheet->fromArray([
                            $row['plate'],
                            $row['driver_name'],
                            $label,
                            $inspection[$pass.'_date'],
                            $item,
                        ], null, 'A'.$line);
                        $line++;
                    }
                }
            }
        }

        $this->widths($sheet, [14, 28, 14, 14, 48]);
        $sheet->freezePane('A2');
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     */
    private function inductions(Worksheet $sheet, array $rows): void
    {
        $sheet->setTitle('Inducciones');
        $this->header($sheet, ['Placa', 'Conductor', 'DNI', 'Fecha', 'Inducción', 'Acta', 'Estado', 'Asistencia', 'Firmó']);
        $line = 2;

        foreach ($rows as $row) {
            foreach ($row['inductions'] as $induction) {
                $sheet->fromArray([
                    $row['plate'],
                    $row['driver_name'],
                    $row['driver_dni'],
                    $induction['date'],
                    $induction['title'],
                    $induction['acta'],
                    $induction['status'],
                    $induction['attendance'],
                    $induction['signed'] ? 'Sí' : 'No',
                ], null, 'A'.$line);
                $line++;
            }
        }

        $this->widths($sheet, [14, 28, 14, 14, 36, 12, 14, 14, 10]);
        $sheet->freezePane('A2');
    }

    /**
     * @param  array{state?: string, expires_at?: string}|null  $document
     */
    private function docState(?array $document): string
    {
        $state = $document['state'] ?? 'falta';

        return match ($state) {
            'vigente' => 'Vigente',
            'vencido' => 'Vencido'.(($document['expires_at'] ?? '') !== '' ? ' '.$document['expires_at'] : ''),
            default => 'Falta',
        };
    }

    /**
     * @param  list<string>  $headers
     */
    private function header(Worksheet $sheet, array $headers): void
    {
        $sheet->fromArray($headers, null, 'A1');
        $last = $sheet->getHighestColumn();
        $sheet->getStyle('A1:'.$last.'1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A2B4C']],
            'alignment' => ['vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D7E3F0']]],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(22);
    }

    /**
     * @param  list<int>  $widths
     */
    private function widths(Worksheet $sheet, array $widths): void
    {
        foreach ($widths as $index => $width) {
            $sheet->getColumnDimensionByColumn($index + 1)->setWidth($width);
        }
    }
}
