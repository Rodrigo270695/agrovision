<?php

namespace App\Support;

use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class ObservationListExcel
{
    /**
     * @param  list<array<string, mixed>>  $rows
     * @param  array{month?: string, grade?: string, search?: string, generated_at?: string, total?: int}  $meta
     */
    public function download(array $rows, string $filename, array $meta = []): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('Agrovision')
            ->setTitle('Observaciones')
            ->setSubject('Observaciones sin levantar');

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Observaciones');
        $sheet->getTabColor()->setRGB('1A2B4C');

        $columns = [
            ['FECHA', '1A2B4C', 16],
            ['INSPECCIÓN', '1A2B4C', 18],
            ['PLACA', '1A2B4C', 14],
            ['CONDUCTOR', '1F6A5B', 34],
            ['DNI', '1F6A5B', 16],
            ['ESTADO', '8A5A12', 22],
            ['LEVANTAMIENTO', '2E5A9E', 32],
            ['TIEMPO SIN LEVANTAR', '1A2B4C', 22],
            ['DÍAS', '1A2B4C', 10],
        ];

        $lastColumn = 'I';
        $headerRow = 3;

        $sheet->mergeCells("A1:{$lastColumn}1");
        $sheet->setCellValue('A1', 'OBSERVACIONES');
        $sheet->getRowDimension(1)->setRowHeight(28);
        $sheet->getStyle("A1:{$lastColumn}1")->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 16,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1A2B4C'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
                'indent' => 1,
            ],
        ]);

        $summary = sprintf(
            'Mes: %s    ·    Estado: %s    ·    Búsqueda: %s    ·    Registros: %d    ·    Generado: %s',
            $meta['month'] ?? '—',
            $meta['grade'] ?? 'Con observación y desaprobados',
            $meta['search'] ?? 'Sin búsqueda',
            $meta['total'] ?? count($rows),
            $meta['generated_at'] ?? now()->timezone(config('app.timezone'))->format('d/m/Y H:i'),
        );

        $sheet->mergeCells("A2:{$lastColumn}2");
        $sheet->setCellValue('A2', $summary);
        $sheet->getRowDimension(2)->setRowHeight(20);
        $sheet->getStyle("A2:{$lastColumn}2")->applyFromArray([
            'font' => [
                'size' => 10,
                'color' => ['rgb' => '1A2B4C'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => 'E8F1FA'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_LEFT,
                'vertical' => Alignment::VERTICAL_CENTER,
                'indent' => 1,
            ],
        ]);

        foreach ($columns as $index => $column) {
            $cell = [$index + 1, $headerRow];
            $sheet->setCellValue($cell, $column[0]);
            $sheet->getStyle($cell)->applyFromArray([
                'font' => [
                    'bold' => true,
                    'size' => 10,
                    'color' => ['rgb' => 'FFFFFF'],
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => $column[1]],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'wrapText' => true,
                ],
            ]);
            $sheet->getColumnDimensionByColumn($index + 1)->setWidth($column[2]);
        }

        $sheet->getRowDimension($headerRow)->setRowHeight(24);

        $rowNumber = $headerRow + 1;
        $written = 0;

        foreach ($rows as $row) {
            $date = '';
            if (! empty($row['inspected_on'])) {
                $date = \Carbon\Carbon::parse(
                    (string) $row['inspected_on'],
                    (string) config('app.timezone'),
                )->format('d/m/Y');
            }

            $sheet->setCellValueExplicit("A{$rowNumber}", $date, DataType::TYPE_STRING);
            $sheet->setCellValue("B{$rowNumber}", (string) ($row['pass_label'] ?? ''));
            $sheet->setCellValue("C{$rowNumber}", (string) ($row['plate_number'] ?? ''));
            $sheet->setCellValue("D{$rowNumber}", (string) ($row['driver_name'] ?? ''));
            $sheet->setCellValueExplicit("E{$rowNumber}", (string) ($row['driver_dni'] ?? ''), DataType::TYPE_STRING);
            $sheet->setCellValue("F{$rowNumber}", (string) ($row['grade_label'] ?? ''));
            $sheet->setCellValue("G{$rowNumber}", (string) ($row['remediation']['status_label'] ?? ''));
            $sheet->setCellValue("H{$rowNumber}", (string) ($row['pending_label'] ?? '—'));
            if ($row['pending_days'] === null || $row['pending_days'] === '') {
                $sheet->setCellValue("I{$rowNumber}", '—');
            } else {
                $sheet->setCellValue("I{$rowNumber}", (int) $row['pending_days']);
            }

            $fill = $written % 2 === 0 ? 'FFFFFF' : 'F4F7FB';
            $sheet->getStyle("A{$rowNumber}:{$lastColumn}{$rowNumber}")->applyFromArray([
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => $fill],
                ],
                'alignment' => [
                    'vertical' => Alignment::VERTICAL_CENTER,
                ],
                'font' => [
                    'size' => 10,
                    'color' => ['rgb' => '1A2B4C'],
                ],
            ]);
            $sheet->getRowDimension($rowNumber)->setRowHeight(18);

            $rowNumber++;
            $written++;
        }

        $lastDataRow = max($headerRow, $rowNumber - 1);

        if ($written === 0) {
            $sheet->mergeCells("A4:{$lastColumn}4");
            $sheet->setCellValue('A4', 'Sin registros para los filtros aplicados.');
            $sheet->getStyle("A4:{$lastColumn}4")->applyFromArray([
                'font' => [
                    'italic' => true,
                    'color' => ['rgb' => '5A7390'],
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_LEFT,
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'indent' => 1,
                ],
            ]);
            $lastDataRow = 4;
        }

        $sheet->getStyle("A{$headerRow}:{$lastColumn}{$lastDataRow}")->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'D0D7E2'],
                ],
            ],
        ]);

        $sheet->freezePane('A4');
        $sheet->setAutoFilter("A{$headerRow}:{$lastColumn}{$lastDataRow}");
        $sheet->setSelectedCell('A4');

        $pageSetup = $sheet->getPageSetup();
        $pageSetup->setOrientation(PageSetup::ORIENTATION_LANDSCAPE);
        $pageSetup->setPaperSize(PageSetup::PAPERSIZE_A4);
        $pageSetup->setFitToWidth(1);
        $pageSetup->setFitToHeight(0);
        $pageSetup->setRowsToRepeatAtTopByStartAndEnd(1, $headerRow);
        $sheet->getPageMargins()->setTop(0.5)->setBottom(0.5)->setLeft(0.4)->setRight(0.4);
        $sheet->getHeaderFooter()->setOddFooter('&LAgrovision · Observaciones&RPágina &P de &N');

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer): void {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }
}
