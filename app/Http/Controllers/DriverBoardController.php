<?php

namespace App\Http\Controllers;

use App\Models\Induction;
use App\Models\InductionAttendee;
use App\Models\Site;
use App\Models\Unit;
use App\Models\User;
use App\Support\InductionFormOptions;
use App\Support\InductionStatuses;
use App\Support\ReportPeriod;
use App\Support\SystemRoles;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use Symfony\Component\HttpFoundation\StreamedResponse;

class DriverBoardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $selection = $this->selection($request);
        $range = $selection['range'];
        $coordinatorId = $selection['coordinator_id'];
        $inspectorId = $selection['inspector_id'];
        $siteId = $selection['site_id'];

        $drivers = $this->drivers($coordinatorId, $siteId);
        $sessions = $this->sessions($range, $inspectorId);
        $items = $this->inductionRings($sessions, $drivers);
        $activeDrivers = $drivers->where('active', true)->count();

        $coordinatorNames = $drivers
            ->pluck('coordinator')
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->all();

        return Inertia::render('driver-board/index', [
            'items' => $items,
            'summary' => [
                'drivers' => $activeDrivers,
                'baja' => $drivers->count() - $activeDrivers,
                'week_label' => $range['label'],
                'coordinators' => $coordinatorNames,
            ],
            'filters' => [
                'date_from' => $range['from'],
                'date_to' => $range['to'],
                'coordinator_id' => $coordinatorId,
                'inspector_id' => $inspectorId,
                'sede' => $siteId,
            ],
            'coordinators' => $this->coordinatorOptions(
                SystemRoles::currentIsScopedCoordinator() ? (int) Auth::id() : null,
            ),
            'inspectors' => $this->inspectorOptions(),
            'sedes' => $this->sedeOptions(),
            'scoped' => SystemRoles::currentIsScopedCoordinator(),
        ]);
    }

    public function excel(Request $request): StreamedResponse
    {
        $selection = $this->selection($request);
        $drivers = $this->drivers($selection['coordinator_id'], $selection['site_id']);
        $sessions = $this->sessions($selection['range'], $selection['inspector_id']);
        $topics = $this->topics($sessions, $drivers);
        $activeCount = $drivers->where('active', true)->count();
        $bajaCount = $drivers->count() - $activeCount;

        $spreadsheet = new Spreadsheet;
        $this->coverageSheet($spreadsheet, $selection, $topics, $activeCount, $bajaCount);
        $this->driversSheet($spreadsheet, $drivers, $topics);

        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function () use ($writer): void {
            $writer->save('php://output');
        }, 'tablero-conductores.xlsx', [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    /**
     * @return array{range: array{from: string|null, to: string|null, label: string}, coordinator_id: int|null, inspector_id: int|null, site_id: int|null}
     */
    private function selection(Request $request): array
    {
        $validated = $request->validate([
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'coordinator_id' => ['nullable', 'integer'],
            'inspector_id' => ['nullable', 'integer'],
            'sede' => ['nullable', 'integer'],
        ]);

        $coordinatorId = isset($validated['coordinator_id'])
            ? (int) $validated['coordinator_id']
            : null;
        $inspectorId = isset($validated['inspector_id'])
            ? (int) $validated['inspector_id']
            : null;
        $siteId = isset($validated['sede']) ? (int) $validated['sede'] : null;

        if (SystemRoles::currentIsScopedCoordinator()) {
            $coordinatorId = (int) Auth::id();
        }

        return [
            'range' => ReportPeriod::range($validated['date_from'] ?? null, $validated['date_to'] ?? null),
            'coordinator_id' => $coordinatorId,
            'inspector_id' => $inspectorId,
            'site_id' => $siteId,
        ];
    }

    /**
     * @return Collection<string, array{coordinator: string|null, name: string, dni: string, units: list<int>, active: bool}>
     */
    private function drivers(?int $coordinatorId, ?int $siteId): Collection
    {
        $query = Unit::query()
            ->with([
                'coordinatorUser:id,name',
            ])
            ->whereHas('period', fn ($builder) => $builder->where('status', 'active'))
            ->whereNotNull('driver_name')
            ->where('driver_name', '!=', '');

        if ($siteId) {
            $query->whereIn('coordinator_id', $this->coordinatorIdsForSite($siteId));
        }

        if ($coordinatorId) {
            $query->where('coordinator_id', $coordinatorId);
        }

        /** @var Collection<string, array{coordinator: string|null, name: string, dni: string, units: list<int>, active: bool}> $drivers */
        $drivers = collect();

        foreach ($query->get() as $unit) {
            $key = $this->identity($unit->driver_dni, $unit->driver_name);

            if ($key === null) {
                continue;
            }

            $dni = preg_replace('/\D+/', '', (string) $unit->driver_dni) ?? '';
            $current = $drivers->get($key, [
                'coordinator' => null,
                'name' => trim((string) $unit->driver_name),
                'dni' => $dni,
                'units' => [],
                'active' => false,
            ]);

            if ($current['dni'] === '' && $dni !== '') {
                $current['dni'] = $dni;
            }
            $current['units'][] = (int) $unit->id;
            $current['coordinator'] ??= $unit->coordinatorUser?->name;

            if ((string) $unit->status !== 'inactive') {
                $current['active'] = true;
            }

            $drivers->put($key, $current);
        }

        return $drivers;
    }

    /**
     * @return Collection<int, Induction>
     */
    private function sessions(array $range, ?int $inspectorId): Collection
    {
        $query = Induction::query()
            ->with([
                'attendees:id,induction_id,unit_id,driver_name,driver_dni,status,signature_path',
            ]);

        if ($inspectorId) {
            $query->where('created_by', $inspectorId);
        }

        if ($range['from'] !== null && $range['to'] !== null) {
            $query->where(function ($builder) use ($range) {
                $builder
                    ->whereBetween('session_date', [$range['from'], $range['to']])
                    ->orWhere(function ($inner) use ($range) {
                        $inner
                            ->whereNull('session_date')
                            ->whereBetween('scheduled_at', [
                                $range['from'].' 00:00:00',
                                $range['to'].' 23:59:59',
                            ]);
                    });
            });
        }

        return $query
            ->orderByDesc('scheduled_at')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * Una tarjeta por tema de inducción. El anillo es la cobertura de la
     * flota activa: ya la tienen contra los que faltan. De baja son los
     * conductores cuya unidad quedó inactiva en la última carga.
     *
     * @param  Collection<int, Induction>  $sessions
     * @param  Collection<string, array{active?: bool, name?: string}>  $drivers
     * @return list<array<string, mixed>>
     */
    private function inductionRings(Collection $sessions, Collection $drivers): array
    {
        $topics = $this->topics($sessions, $drivers);
        $activeCount = $drivers->where('active', true)->count();
        $bajaCount = $drivers->count() - $activeCount;
        $rings = [];

        foreach ($topics as $topic) {
            $rings[] = $this->card(
                'tema-'.$topic['key'],
                $topic['label'],
                'Vigente por 1 año',
                $activeCount > 0 ? (int) round(($topic['have'] / $activeCount) * 100) : 0,
                [
                    $this->metric('tienen', 'Ya la tienen', $topic['have'], 'ok'),
                    $this->metric('faltan', 'Faltan', $topic['missing'], 'bad'),
                    $this->metric('baja', 'De baja', $bajaCount, 'muted'),
                ],
            );
        }

        return $rings;
    }

    /**
     * @param  Collection<int, Induction>  $sessions
     * @param  Collection<string, array{active?: bool}>  $drivers
     * @return list<array{key: string, label: string, covered: array<string, true>, have: int, missing: int}>
     */
    private function topics(Collection $sessions, Collection $drivers): array
    {
        $active = [];

        foreach ($drivers as $key => $driver) {
            if ($driver['active'] ?? false) {
                $active[$key] = true;
            }
        }

        $activeCount = count($active);
        $validFrom = now()->subYear()->startOfDay();
        $topics = [];

        foreach ($sessions as $induction) {
            if ($induction->status === InductionStatuses::CANCELLED) {
                continue;
            }

            $titleKey = $this->normalize($this->inductionLabel($induction));

            if ($titleKey === '') {
                continue;
            }

            if (! isset($topics[$titleKey])) {
                $topics[$titleKey] = [
                    'key' => $titleKey,
                    'label' => $this->inductionLabel($induction),
                    'covered' => [],
                ];
            }

            $when = $induction->session_date ?? $induction->scheduled_at;

            if ($when === null || $when->lt($validFrom)) {
                continue;
            }

            foreach ($induction->attendees as $attendee) {
                if (! $this->attended($attendee)) {
                    continue;
                }

                $key = $this->identity($attendee->driver_dni, $attendee->driver_name);

                if ($key !== null && isset($active[$key])) {
                    $topics[$titleKey]['covered'][$key] = true;
                }
            }
        }

        $rows = [];

        foreach ($topics as $topic) {
            $have = count($topic['covered']);
            $topic['have'] = $have;
            $topic['missing'] = max(0, $activeCount - $have);
            $rows[] = $topic;
        }

        usort($rows, fn (array $left, array $right) => strnatcasecmp($left['label'], $right['label']));

        return $rows;
    }

    /**
     * @param  array{range: array{from: string|null, to: string|null, label: string}, coordinator_id: int|null, inspector_id: int|null, site_id: int|null}  $selection
     * @param  list<array{label: string, have: int, missing: int}>  $topics
     */
    private function coverageSheet(Spreadsheet $spreadsheet, array $selection, array $topics, int $activeCount, int $bajaCount): void
    {
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Cobertura');
        $coordinator = collect($this->coordinatorOptions(null))->firstWhere('id', $selection['coordinator_id']);
        $inspector = collect($this->inspectorOptions())->firstWhere('id', $selection['inspector_id']);
        $sede = collect($this->sedeOptions())->firstWhere('id', $selection['site_id']);

        $sheet->setCellValue('A1', 'Tablero de mando SST conductores');
        $sheet->setCellValue('A2', 'Fechas');
        $sheet->setCellValue('B2', $selection['range']['label']);
        $sheet->setCellValue('A3', 'Coordinador');
        $sheet->setCellValue('B3', $coordinator['name'] ?? 'Todos');
        $sheet->setCellValue('C3', 'Inspector');
        $sheet->setCellValue('D3', $inspector['name'] ?? 'Todos');
        $sheet->setCellValue('E3', 'Sede');
        $sheet->setCellValue('F3', $sede['name'] ?? 'Todas');
        $sheet->setCellValue('A4', 'Conductores activos');
        $sheet->setCellValue('B4', $activeCount);
        $sheet->setCellValue('C4', 'De baja');
        $sheet->setCellValue('D4', $bajaCount);

        $headers = ['Inducción', 'Ya la tienen', 'Faltan', 'De baja', 'Cobertura %'];
        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 6], $header);
        }

        $rowNumber = 7;

        foreach ($topics as $topic) {
            $percent = $activeCount > 0 ? (int) round(($topic['have'] / $activeCount) * 100) : 0;
            $sheet->setCellValue([1, $rowNumber], $topic['label']);
            $sheet->setCellValue([2, $rowNumber], $topic['have']);
            $sheet->setCellValue([3, $rowNumber], $topic['missing']);
            $sheet->setCellValue([4, $rowNumber], $bajaCount);
            $sheet->setCellValue([5, $rowNumber], $percent);
            $rowNumber++;
        }

        if ($topics === []) {
            $sheet->setCellValue('A7', 'No hay inducciones para este filtro.');
        }

        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14)->getColor()->setRGB('1A2B4C');
        $sheet->getStyle('A6:E6')->applyFromArray([
            'font' => ['bold' => true, 'size' => 9, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A2B4C']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $lastRow = max(6, $rowNumber - 1);
        $sheet->getStyle("A6:E{$lastRow}")->applyFromArray([
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D7E3F0']]],
        ]);
        $sheet->freezePane('A7');

        foreach (range(1, 6) as $index) {
            $sheet->getColumnDimensionByColumn($index)->setWidth($index === 1 ? 42 : 22);
        }
    }

    /**
     * @param  Collection<string, array{coordinator: string|null, name: string, dni: string, active: bool}>  $drivers
     * @param  list<array{label: string, covered: array<string, true>}>  $topics
     */
    private function driversSheet(Spreadsheet $spreadsheet, Collection $drivers, array $topics): void
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Conductores');
        $headers = ['Conductor', 'DNI', 'Coordinador', 'Estado'];

        foreach ($topics as $topic) {
            $headers[] = $topic['label'];
        }

        foreach ($headers as $index => $header) {
            $sheet->setCellValue([$index + 1, 1], $header);
        }

        $sorted = $drivers->sort(function (array $left, array $right): int {
            if ($left['active'] !== $right['active']) {
                return $left['active'] ? -1 : 1;
            }

            return strnatcasecmp($this->normalize($left['name']), $this->normalize($right['name']));
        });

        $rowNumber = 2;

        foreach ($sorted as $key => $driver) {
            $sheet->setCellValue([1, $rowNumber], $driver['name']);
            $sheet->setCellValueExplicit([2, $rowNumber], $driver['dni'], DataType::TYPE_STRING);
            $sheet->setCellValue([3, $rowNumber], $driver['coordinator'] ?? '');
            $sheet->setCellValue([4, $rowNumber], $driver['active'] ? 'Activo' : 'De baja');

            foreach ($topics as $index => $topic) {
                $value = '—';

                if ($driver['active']) {
                    $value = isset($topic['covered'][$key]) ? 'Sí' : 'No';
                }

                $sheet->setCellValue([$index + 5, $rowNumber], $value);
            }

            $rowNumber++;
        }

        $lastColumn = max(4, count($headers));
        $lastRow = max(1, $rowNumber - 1);
        $lastLetter = Coordinate::stringFromColumnIndex($lastColumn);
        $sheet->getStyle("A1:{$lastLetter}1")->applyFromArray([
            'font' => ['bold' => true, 'size' => 9, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1A2B4C']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'wrapText' => true],
        ]);
        $sheet->getStyle("A1:{$lastLetter}{$lastRow}")->applyFromArray([
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'D7E3F0']]],
        ]);
        $sheet->freezePane('A2');
        $sheet->setAutoFilter("A1:{$lastLetter}{$lastRow}");

        foreach (range(1, $lastColumn) as $index) {
            $sheet->getColumnDimensionByColumn($index)->setWidth($index === 1 || $index >= 5 ? 36 : 18);
        }
    }

    private function inductionLabel(Induction $induction): string
    {
        $title = trim((string) $induction->title);

        if ($title !== '') {
            return $title;
        }

        return InductionFormOptions::activities()[$induction->activity] ?? 'Inducción';
    }

    /**
     * @param  list<array{key: string, label: string, value: int, tone: string}>  $metrics
     * @return array<string, mixed>
     */
    private function card(string $key, string $label, string $detail, int $percent, array $metrics): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'detail' => $detail,
            'source' => 'induccion',
            'percent' => $percent,
            'metrics' => $metrics,
        ];
    }

    /**
     * @return array{key: string, label: string, value: int, tone: string}
     */
    private function metric(string $key, string $label, int $value, string $tone): array
    {
        return [
            'key' => $key,
            'label' => $label,
            'value' => $value,
            'tone' => $tone,
        ];
    }

    private function attended(InductionAttendee $attendee): bool
    {
        return $attendee->status === 'attended' || filled($attendee->signature_path);
    }

    private function identity(?string $dni, ?string $name): ?string
    {
        $digits = preg_replace('/\D+/', '', (string) $dni) ?? '';

        if ($digits !== '') {
            return 'dni:'.$digits;
        }

        $normalized = $this->normalize($name);

        return $normalized === '' ? null : 'name:'.$normalized;
    }

    private function normalize(?string $value): string
    {
        $value = mb_strtolower(trim((string) $value));
        $value = strtr($value, [
            'á' => 'a',
            'é' => 'e',
            'í' => 'i',
            'ó' => 'o',
            'ú' => 'u',
            'ü' => 'u',
            'ñ' => 'n',
        ]);

        return preg_replace('/\s+/', ' ', $value) ?? '';
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function coordinatorOptions(?int $forcedId): array
    {
        $coordinators = SystemRoles::coordinators();

        if ($forcedId) {
            $coordinators = $coordinators->where('id', $forcedId)->values();
        }

        return $coordinators
            ->map(fn ($user) => [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
            ])
            ->all();
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function inspectorOptions(): array
    {
        return SystemRoles::inspectors()
            ->map(fn ($user) => [
                'id' => (int) $user->id,
                'name' => (string) $user->name,
            ])
            ->all();
    }

    /**
     * Sedes activas del catálogo de Lugares.
     *
     * @return list<array{id: int, name: string}>
     */
    private function sedeOptions(): array
    {
        return Site::query()
            ->where('status', 'active')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Site $site) => [
                'id' => (int) $site->id,
                'name' => (string) $site->name,
            ])
            ->all();
    }

    /**
     * Coordinadores asignados a un lugar de esa sede.
     *
     * @return list<int>
     */
    private function coordinatorIdsForSite(int $siteId): array
    {
        return User::query()
            ->where(function ($query) use ($siteId) {
                $query
                    ->whereHas('places', fn ($places) => $places->where('places.site_id', $siteId))
                    ->orWhereHas('place', fn ($place) => $place->where('places.site_id', $siteId));
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}
