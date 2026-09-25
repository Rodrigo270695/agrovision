<?php

namespace App\Support;

use App\Models\Unit;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistAnswer;
use App\Models\UnitDocument;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

final class InspectionDatabaseExporter
{
    /**
     * Columnas de la base (mismo orden y títulos que el Excel de inspecciones).
     *
     * @var list<array{header: string, type: string, needles?: list<string>}>
     */
    private const COLUMNS = [
        ['header' => 'N°', 'type' => 'number'],
        ['header' => 'IND', 'type' => 'ind'],
        ['header' => 'PLACA', 'type' => 'plate'],
        ['header' => 'COORDINADOR ', 'type' => 'coordinator'],
        ['header' => 'RESPONSABLE TDP', 'type' => 'driver'],
        ['header' => 'FECHA DE INGRESO', 'type' => 'entry_date'],
        ['header' => 'ESTATUS ', 'type' => 'status'],
        ['header' => 'FECHA DE INSPECCION', 'type' => 'inspected_on'],
        ['header' => 'SEDE', 'type' => 'sede'],
        ['header' => 'TARJETA DE PROPIEDAD', 'type' => 'mark', 'needles' => ['tarjeta de propiedad']],
        ['header' => 'NUMERO DE LICENCIA', 'type' => 'license_number'],
        ['header' => 'MARCA', 'type' => 'brand'],
        ['header' => 'MODELO', 'type' => 'model'],
        ['header' => 'RUC', 'type' => 'ruc'],
        ['header' => 'PROVEEDOR', 'type' => 'provider'],
        ['header' => 'TIPO DE VEHICULO', 'type' => 'vehicle_type'],
        ['header' => 'CATEGORIA  DE BREVETE ', 'type' => 'license_class'],
        ['header' => "LICENCIA \n(fecha de vencimiento)", 'type' => 'license_date'],
        ['header' => 'DÍAS', 'type' => 'license_days'],
        ['header' => 'VIGENCIA_LICENCIA', 'type' => 'license_text'],
        ['header' => "SOAT \n(fecha de vencimiento)", 'type' => 'soat_date'],
        ['header' => 'DÍAS', 'type' => 'soat_days'],
        ['header' => 'VIGENCIA_SOAT', 'type' => 'soat_text'],
        ['header' => "Revisión técnica \n(fecha de vencimiento)", 'type' => 'itv_date'],
        ['header' => 'DÍAS', 'type' => 'itv_days'],
        ['header' => 'VIGENCIA_REVISIÓN TÉCNICA', 'type' => 'itv_text'],
        ['header' => 'OBSERVACIONES', 'type' => 'nok_count'],
        ['header' => 'Corta', 'type' => 'mark', 'needles' => ['luz corta']],
        ['header' => 'Larga', 'type' => 'mark', 'needles' => ['luz larga']],
        ['header' => 'Intermitente derecho', 'type' => 'mark', 'needles' => ['intermitente derecho']],
        ['header' => ' Intermitente izquierdo', 'type' => 'mark', 'needles' => ['intermitente izquierdo']],
        ['header' => 'Estacionamiento', 'type' => 'mark', 'needles' => ['estacionamiento']],
        ['header' => 'Retroceso', 'type' => 'mark', 'needles' => ['luz de retroceso']],
        ['header' => 'Claxon', 'type' => 'mark', 'needles' => ['claxon']],
        ['header' => 'Alarma retroceso', 'type' => 'mark', 'needles' => ['alarma de retroceso', 'alarma retroceso']],
        ['header' => 'Llantas con cocada mínima de 4 mm', 'type' => 'mark', 'needles' => ['llantas con cocada', 'cocada minima']],
        ['header' => 'Llanta de repuesto', 'type' => 'mark', 'needles' => ['llanta de repuesto']],
        ['header' => 'Gata ', 'type' => 'mark', 'needles' => ['gata']],
        ['header' => 'Llave de ruedas', 'type' => 'mark', 'needles' => ['llave de ruedas']],
        ['header' => 'Estado de ruedas', 'type' => 'mark', 'needles' => ['estado de ruedas']],
        ['header' => ' Estado de lunas generales', 'type' => 'mark', 'needles' => ['lunas generales']],
        ['header' => 'Plumillas operativas', 'type' => 'mark', 'needles' => ['plumillas']],
        ['header' => 'Botiquin', 'type' => 'mark', 'needles' => ['botiquin']],
        ['header' => 'Extintor', 'type' => 'mark', 'needles' => ['extintor']],
        ['header' => 'Conos o Triángulos de Seguridad', 'type' => 'mark', 'needles' => ['conos', 'triangulos de seguridad']],
        ['header' => 'Tacos', 'type' => 'mark', 'needles' => ['tacos']],
        ['header' => 'Espejos laterales operativos', 'type' => 'mark', 'needles' => ['espejos laterales']],
        ['header' => 'Cinturon de seguridad', 'type' => 'mark', 'needles' => ['cinturones de seguridad', 'cinturon de seguridad']],
        ['header' => 'Salidas de Emergencia', 'type' => 'mark', 'needles' => ['salidas de emergencia']],
        ['header' => 'Accesorios de salidas de emergencia', 'type' => 'mark', 'needles' => ['martillos', 'accesorios de salidas']],
        ['header' => 'Ventana de emergencia señalizada', 'type' => 'mark', 'needles' => ['ventanas de emergencia', 'ventana de emergencia']],
        ['header' => 'Cuenta con eslinga tiro o cable de remolque', 'type' => 'mark', 'needles' => ['estrobo', 'eslinga', 'cable de desenganche', 'cable de remolque']],
        ['header' => 'Retro reflectivas', 'type' => 'mark', 'needles' => ['retro reflectivas', 'cintas retro']],
        ['header' => 'Pasos o peldaños en buen estado', 'type' => 'mark', 'needles' => ['pasos o pasadizos', 'pasos o peldanos', 'peldaños']],
        ['header' => 'Aros con esparragos y pernos completos', 'type' => 'mark', 'needles' => ['espaldar y pernos', 'aros con esparragos', 'pernos completos']],
        ['header' => 'Estado de asientos', 'type' => 'mark', 'needles' => ['estado de asientos']],
        ['header' => 'La luna delantera del vehiculo esta libre de obstaculos que permitan la vizualización al conductor', 'type' => 'mark', 'needles' => ['luna delantera']],
        ['header' => 'Estado de pedales', 'type' => 'mark', 'needles' => ['pedales']],
        ['header' => 'Herramientas manuales', 'type' => 'mark', 'needles' => ['herramientas']],
        ['header' => 'Productos químicos', 'type' => 'mark', 'needles' => ['productos quimicos']],
        ['header' => 'Flayer de cinturon de seguridad', 'type' => 'mark', 'needles' => ['flayer de uso de cinturon', 'flayer de cinturon']],
        ['header' => 'Flayer de numero de emergencia', 'type' => 'mark', 'needles' => ['flayer de numeros', 'numeros de emergencia']],
        ['header' => 'PUNTAJE', 'type' => 'score'],
        ['header' => 'Observacion Corta', 'type' => 'note', 'needles' => ['luz corta']],
        ['header' => 'Observacion Larga', 'type' => 'note', 'needles' => ['luz larga']],
        ['header' => 'Observacion Intermitente derecho', 'type' => 'note', 'needles' => ['intermitente derecho']],
        ['header' => 'Observacion Intermitente izquierdo', 'type' => 'note', 'needles' => ['intermitente izquierdo']],
        ['header' => 'Observacion Estacionamiento', 'type' => 'note', 'needles' => ['estacionamiento']],
        ['header' => 'Observacion Retroceso', 'type' => 'note', 'needles' => ['luz de retroceso']],
        ['header' => 'Observacion Claxon', 'type' => 'note', 'needles' => ['claxon']],
        ['header' => 'Observacion Alarma retroceso', 'type' => 'note', 'needles' => ['alarma de retroceso', 'alarma retroceso']],
        ['header' => 'Observacion Llantas con cocada mínima de 4 mm', 'type' => 'note', 'needles' => ['llantas con cocada', 'cocada minima']],
        ['header' => 'Observacion Llanta de repuesto', 'type' => 'note', 'needles' => ['llanta de repuesto']],
        ['header' => 'Estado de ruedas', 'type' => 'note', 'needles' => ['estado de ruedas']],
        ['header' => 'Observacion Gata ', 'type' => 'note', 'needles' => ['gata']],
        ['header' => 'Observacion Llave de ruedas', 'type' => 'note', 'needles' => ['llave de ruedas']],
        ['header' => 'Observacion Estado de lunas generales', 'type' => 'note', 'needles' => ['lunas generales']],
        ['header' => 'Observacion Plumillas operativas', 'type' => 'note', 'needles' => ['plumillas']],
        ['header' => 'Observacion Botiquín', 'type' => 'note', 'needles' => ['botiquin']],
        ['header' => 'Observacion Extintor', 'type' => 'note', 'needles' => ['extintor']],
        ['header' => 'Observacion Conos o Triángulos de Seguridad', 'type' => 'note', 'needles' => ['conos', 'triangulos de seguridad']],
        ['header' => 'Observacion Tacos', 'type' => 'note', 'needles' => ['tacos']],
        ['header' => 'Observacion Espejos laterales operativos', 'type' => 'note', 'needles' => ['espejos laterales']],
        ['header' => 'Observacion de cinturones de seguridad', 'type' => 'note', 'needles' => ['cinturones de seguridad', 'cinturon de seguridad']],
        ['header' => 'Observacion Salidas de Emergencia', 'type' => 'note', 'needles' => ['salidas de emergencia']],
        ['header' => 'Observacion martillos', 'type' => 'note', 'needles' => ['martillos', 'accesorios de salidas']],
        ['header' => 'Observación Ventana de emergencia señalizada', 'type' => 'note', 'needles' => ['ventanas de emergencia', 'ventana de emergencia']],
        ['header' => 'Observación cuenta con eslinga tiro o cable de remolque', 'type' => 'note', 'needles' => ['estrobo', 'eslinga', 'cable de desenganche', 'cable de remolque']],
        ['header' => 'Observación retro reflectivas', 'type' => 'note', 'needles' => ['retro reflectivas', 'cintas retro']],
        ['header' => 'Observación Pasos o peldaños en buen estado', 'type' => 'note', 'needles' => ['pasos o pasadizos', 'pasos o peldanos', 'peldaños']],
        ['header' => 'Observación Aros con esparragos y pernos completos', 'type' => 'note', 'needles' => ['espaldar y pernos', 'aros con esparragos', 'pernos completos']],
        ['header' => 'Observación Estado de asientos', 'type' => 'note', 'needles' => ['estado de asientos']],
        ['header' => 'Observación La luna delantera del vehiculo esta libre de obstaculos que permitan la vizualización al conductor', 'type' => 'note', 'needles' => ['luna delantera']],
        ['header' => 'Observación Estado de pedales', 'type' => 'note', 'needles' => ['pedales']],
        ['header' => 'Observacion Herramientas manuales', 'type' => 'note', 'needles' => ['herramientas']],
        ['header' => 'Flayer de cinturón de seguridad', 'type' => 'note', 'needles' => ['flayer de uso de cinturon', 'flayer de cinturon']],
        ['header' => 'Flayer de números de emergencia', 'type' => 'note', 'needles' => ['flayer de numeros', 'numeros de emergencia']],
        ['header' => 'Observacion Productos químicos', 'type' => 'note', 'needles' => ['productos quimicos']],
    ];

    /**
     * @param  Collection<int, UnitChecklist>  $checklists
     */
    public function download(Collection $checklists, string $filename): StreamedResponse
    {
        $spreadsheet = new Spreadsheet;
        $spreadsheet->getProperties()
            ->setCreator('Agrovision')
            ->setTitle('Inspecciones')
            ->setSubject('Base de datos de unidades de inspecciones');

        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Inspecciones');

        foreach (self::COLUMNS as $index => $column) {
            $sheet->setCellValue([$index + 1, 1], $column['header']);
        }

        $lastColumn = $this->columnLetter(count(self::COLUMNS));
        $sheet->getStyle("A1:{$lastColumn}1")->applyFromArray([
            'font' => [
                'bold' => true,
                'size' => 9,
                'color' => ['rgb' => 'FFFFFF'],
            ],
            'fill' => [
                'fillType' => Fill::FILL_SOLID,
                'startColor' => ['rgb' => '1A2B4C'],
            ],
            'alignment' => [
                'horizontal' => Alignment::HORIZONTAL_CENTER,
                'vertical' => Alignment::VERTICAL_CENTER,
                'wrapText' => true,
            ],
        ]);
        $sheet->getRowDimension(1)->setRowHeight(36);
        $sheet->freezePane('A2');
        $sheet->setAutoFilter("A1:{$lastColumn}1");

        $rowNumber = 2;
        $sequence = 1;

        foreach ($checklists as $checklist) {
            foreach (['first', 'second'] as $pass) {
                if (! $this->passInExport($checklist, $pass)) {
                    continue;
                }

                $this->writeRow($sheet, $rowNumber, $checklist, $pass, $sequence);
                $rowNumber++;
                $sequence++;
            }
        }

        if ($rowNumber === 2) {
            $sheet->setCellValue('A2', 'Sin inspecciones para los filtros aplicados.');
        }

        $sheet->getStyle("A1:{$lastColumn}".max(1, $rowNumber - 1))->applyFromArray([
            'borders' => [
                'allBorders' => [
                    'borderStyle' => Border::BORDER_THIN,
                    'color' => ['rgb' => 'D7E3F0'],
                ],
            ],
        ]);

        for ($index = 1; $index <= count(self::COLUMNS); $index++) {
            $sheet->getColumnDimension($this->columnLetter($index))->setWidth($index <= 16 ? 22 : 16);
        }

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer): void {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function passInExport(UnitChecklist $checklist, string $pass): bool
    {
        if ($pass === 'first') {
            return true;
        }

        return $checklist->second_inspected_on !== null
            || $checklist->answers->contains(fn (UnitChecklistAnswer $answer) => filled($answer->second_value));
    }

    private function writeRow(
        \PhpOffice\PhpSpreadsheet\Worksheet\Worksheet $sheet,
        int $rowNumber,
        UnitChecklist $checklist,
        string $pass,
        int $sequence,
    ): void {
        $context = $this->context($checklist, $pass);
        $nokCells = [];

        foreach (self::COLUMNS as $index => $column) {
            $coordinate = [$index + 1, $rowNumber];
            $value = $this->cellValue($column, $context, $sequence);

            if ($column['type'] === 'mark' && $value === 'NOK') {
                $nokCells[] = $this->columnLetter($index + 1).$rowNumber;
            }

            if ($value instanceof Carbon) {
                $sheet->setCellValue($coordinate, ExcelDate::PHPToExcel($value));
                $sheet->getStyle($coordinate)->getNumberFormat()->setFormatCode('DD/MM/YYYY');

                continue;
            }

            if ($column['type'] === 'ruc') {
                $sheet->setCellValueExplicit($coordinate, (string) ($value ?? ''), DataType::TYPE_STRING);

                continue;
            }

            $sheet->setCellValue($coordinate, $value);
        }

        foreach ($nokCells as $cell) {
            $sheet->getStyle($cell)->getFont()->getColor()->setRGB('B91C1C');
            $sheet->getStyle($cell)->getFont()->setBold(true);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function context(UnitChecklist $checklist, string $pass): array
    {
        $answers = $checklist->answers;
        $unit = $checklist->unit;
        $marks = [];
        $nok = 0;
        $ok = 0;
        $scored = 0.0;
        $catalog = 0.0;

        foreach (self::COLUMNS as $column) {
            if ($column['type'] !== 'mark') {
                continue;
            }

            $answer = $this->findAnswer($answers, $column['needles'] ?? []);
            $mark = $this->mark($answer, $pass);
            $marks[$column['header']] = $mark;

            if ($mark === 'NOK') {
                $nok++;
            }

            if ($mark === 'OK') {
                $ok++;
            }

            $weight = (float) ($answer?->item?->weight ?? 0);
            $catalog += $weight;

            if ($mark === 'OK') {
                $scored += $weight;
            }
        }

        $licenseDate = $checklist->license_revalidation_on
            ?? $this->documentExpiry($unit, UnitDocumentTypes::DRIVER_LICENSE);
        $soatDate = $this->answerDate($answers, ['soat'])
            ?? $this->documentExpiry($unit, UnitDocumentTypes::SOAT);
        $itvDate = $this->answerDate($answers, ['revision tecnica'])
            ?? $this->documentExpiry($unit, UnitDocumentTypes::TECHNICAL_INSPECTION);

        $license = $this->vigencia('LICENCIA', $licenseDate);
        $soat = $this->vigencia('SOAT', $soatDate);
        $itv = $this->vigencia('REVISIÓN TÉCNICA', $itvDate);

        $marked = $ok + $nok;
        $score = $catalog > 0
            ? round($scored / $catalog * 100, 2)
            : ($marked > 0 ? round($ok / $marked * 100, 2) : 'Ninguna');

        return [
            'checklist' => $checklist,
            'pass' => $pass,
            'answers' => $answers,
            'marks' => $marks,
            'nok' => $nok,
            'score' => $score,
            'license' => $license,
            'soat' => $soat,
            'itv' => $itv,
        ];
    }

    /**
     * @param  array<string, mixed>  $column
     * @param  array<string, mixed>  $context
     */
    private function cellValue(array $column, array $context, int $sequence): mixed
    {
        /** @var UnitChecklist $checklist */
        $checklist = $context['checklist'];
        $unit = $checklist->unit;
        $pass = $context['pass'];

        return match ($column['type']) {
            'number' => $sequence,
            'ind' => $pass === 'second' ? 2 : 1,
            'plate' => $checklist->plate_number,
            'coordinator' => $unit?->coordinatorUser?->name,
            'driver' => $checklist->driver_name,
            'entry_date' => $unit?->service_date,
            'status' => $checklist->period?->status === 'active' ? 'Activa' : 'Inactiva',
            'inspected_on' => $pass === 'second' ? $checklist->second_inspected_on : $checklist->first_inspected_on,
            'sede' => $this->sede($checklist),
            'license_number' => $checklist->license_number,
            'brand' => $checklist->vehicle_info,
            'model' => null,
            'ruc' => $unit?->ruc,
            'provider' => $checklist->provider ?: $unit?->provider,
            'vehicle_type' => $unit?->vehicle_type,
            'license_class' => $checklist->license_class,
            'license_date' => $context['license']['date'],
            'license_days' => $context['license']['days'],
            'license_text' => $context['license']['text'],
            'soat_date' => $context['soat']['date'],
            'soat_days' => $context['soat']['days'],
            'soat_text' => $context['soat']['text'],
            'itv_date' => $context['itv']['date'],
            'itv_days' => $context['itv']['days'],
            'itv_text' => $context['itv']['text'],
            'nok_count' => $context['nok'],
            'score' => $context['score'],
            'mark' => $context['marks'][$column['header']] ?? null,
            'note' => $this->note($this->findAnswer($context['answers'], $column['needles'] ?? [])),
            default => null,
        };
    }

    /**
     * @param  Collection<int, UnitChecklistAnswer>  $answers
     * @param  list<string>  $needles
     */
    private function findAnswer(Collection $answers, array $needles): ?UnitChecklistAnswer
    {
        $best = null;
        $bestScore = null;

        foreach ($answers as $answer) {
            $label = $this->normalize((string) ($answer->item?->label ?? ''));

            if ($label === '') {
                continue;
            }

            foreach ($needles as $needle) {
                $needle = $this->normalize($needle);

                if ($needle === '' || ! str_contains($label, $needle)) {
                    continue;
                }

                $score = (strlen($needle) * 100) - strlen($label);

                if ($bestScore === null || $score > $bestScore) {
                    $bestScore = $score;
                    $best = $answer;
                }
            }
        }

        return $best;
    }

    private function mark(?UnitChecklistAnswer $answer, string $pass): ?string
    {
        $value = $pass === 'second' ? $answer?->second_value : $answer?->first_value;

        return match ($value) {
            'yes' => 'OK',
            'no' => 'NOK',
            default => null,
        };
    }

    private function note(?UnitChecklistAnswer $answer): string
    {
        $text = trim((string) ($answer?->observations ?? ''));

        if ($text === '' || $this->isOnlyDate($text)) {
            return 'Ninguna';
        }

        return $text;
    }

    /**
     * @param  Collection<int, UnitChecklistAnswer>  $answers
     * @param  list<string>  $needles
     */
    private function answerDate(Collection $answers, array $needles): ?Carbon
    {
        $text = trim((string) ($this->findAnswer($answers, $needles)?->observations ?? ''));

        return $this->parseDate($text);
    }

    private function documentExpiry(?Unit $unit, string $type): ?Carbon
    {
        if ($unit === null) {
            return null;
        }

        /** @var UnitDocument|null $document */
        $document = $unit->documents
            ->where('type', $type)
            ->sortByDesc(fn (UnitDocument $item) => $item->expires_at?->timestamp ?? 0)
            ->first();

        return $document?->expires_at;
    }

    /**
     * @return array{date: ?Carbon, days: ?int, text: ?string}
     */
    private function vigencia(string $label, ?Carbon $date): array
    {
        if ($date === null) {
            return ['date' => null, 'days' => null, 'text' => null];
        }

        $today = now()->startOfDay();
        $target = $date->copy()->startOfDay();
        $days = (int) $today->diffInDays($target);
        $days = $target->lt($today) ? -$days : $days;

        $text = $days >= 0
            ? "{$label} VENCE EN {$days} DÍAS"
            : "{$label} VENCIÓ HACE {$days} DÍAS";

        return ['date' => $target, 'days' => $days, 'text' => $text];
    }

    private function sede(UnitChecklist $checklist): ?string
    {
        $location = trim((string) $checklist->location);

        if ($location !== '') {
            return $location;
        }

        $coordinator = $checklist->unit?->coordinatorUser;
        $place = $coordinator?->place ?? $coordinator?->places?->first();

        return $place?->site?->name ?: $place?->name;
    }

    private function parseDate(string $text): ?Carbon
    {
        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $text, $match) === 1) {
            return Carbon::parse($match[1]);
        }

        if (preg_match('/^(\d{2})\/(\d{2})\/(\d{4})/', $text, $match) === 1) {
            return Carbon::createFromFormat('d/m/Y', "{$match[1]}/{$match[2]}/{$match[3]}") ?: null;
        }

        return null;
    }

    private function isOnlyDate(string $text): bool
    {
        return $this->parseDate($text) !== null
            && preg_match('/^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/', $text) === 1;
    }

    private function normalize(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = str_replace(
            ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ'],
            ['a', 'e', 'i', 'o', 'u', 'u', 'n'],
            $value,
        );
        $value = preg_replace('/[^a-z0-9]+/u', ' ', $value) ?? $value;

        return trim($value);
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
