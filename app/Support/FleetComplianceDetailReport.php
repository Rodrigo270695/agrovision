<?php

namespace App\Support;

use App\Models\GpsMovement;
use App\Models\GpsRecord;
use App\Models\Period;
use App\Models\RcInsurance;
use App\Models\RcInsuranceMovement;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class FleetComplianceDetailReport
{
    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @return array{
     *     tab: string,
     *     title: string,
     *     summary: array{ok: int, falta: int, baja: int, pendiente: int, total: int, percent: int},
     *     bars: list<array{
     *         label: string,
     *         week: int,
     *         year: int,
     *         ok: int,
     *         falta: int,
     *         baja: int,
     *         pendiente: int,
     *         total: int,
     *         percent_ok: int
     *     }>,
     *     source_label: string
     * }
     */
    public function build(string $tab, array $range): array
    {
        if (! in_array($tab, ['rc', 'gps'], true)) {
            $tab = 'rc';
        }

        $snapshots = $tab === 'rc'
            ? $this->rcSnapshots($range)
            : $this->gpsSnapshots($range);

        $summary = $this->summaryForRange($snapshots);
        $bars = $this->weeklyBars($range, $snapshots);

        $title = $tab === 'rc' ? 'Seguro RC' : 'GPS';
        $source = $tab === 'rc' ? 'Seguro RC' : 'GPS';

        return [
            'tab' => $tab,
            'title' => $title,
            'summary' => $summary,
            'bars' => $bars,
            'source_label' => sprintf(
                'Base de datos de %s actualizada · %s',
                $source,
                $range['label'],
            ),
        ];
    }

    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @return list<array{plate: string, date: CarbonImmutable, status: string}>
     */
    private function rcSnapshots(array $range): array
    {
        [$from, $to] = $this->bounds($range);

        if ($from === null || $to === null) {
            return [];
        }

        $snapshots = [];
        $platesFromMovements = [];

        $movements = RcInsuranceMovement::query()
            ->with(['record:id,status,plate_number', 'period:id,date'])
            ->whereBetween('service_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('service_date')
            ->orderBy('id')
            ->get();

        foreach ($movements as $movement) {
            $date = CarbonImmutable::parse($movement->service_date)->startOfDay();
            $status = $this->classifyRc($movement, $movement->record);
            $plate = $this->plateKey($movement->plate_number);
            $platesFromMovements[$plate] = true;

            $snapshots[] = [
                'plate' => $plate,
                'date' => $date,
                'status' => $status,
            ];
        }

        $periodIds = Period::query()
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->pluck('id');

        if ($periodIds->isNotEmpty()) {
            $records = RcInsurance::query()
                ->with('period:id,date')
                ->whereIn('period_id', $periodIds)
                ->get();

            foreach ($records as $record) {
                $plate = $this->plateKey($record->plate_number);

                if (isset($platesFromMovements[$plate])) {
                    continue;
                }

                $periodDate = $record->period?->date;

                if ($periodDate === null) {
                    continue;
                }

                $date = CarbonImmutable::parse($periodDate)->startOfDay();

                if (! $date->betweenIncluded($from, $to)) {
                    continue;
                }

                $snapshots[] = [
                    'plate' => $plate,
                    'date' => $date,
                    'status' => $this->classifyRcRecord($record),
                ];
            }
        }

        return $snapshots;
    }

    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @return list<array{plate: string, date: CarbonImmutable, status: string}>
     */
    private function gpsSnapshots(array $range): array
    {
        [$from, $to] = $this->bounds($range);

        if ($from === null || $to === null) {
            return [];
        }

        $snapshots = [];
        $platesFromMovements = [];

        $movements = GpsMovement::query()
            ->with(['record:id,status,plate_number', 'period:id,date'])
            ->whereBetween('service_date', [$from->toDateString(), $to->toDateString()])
            ->orderBy('service_date')
            ->orderBy('id')
            ->get();

        foreach ($movements as $movement) {
            $date = CarbonImmutable::parse($movement->service_date)->startOfDay();
            $status = $this->classifyGps($movement->imei, $movement->record?->status);
            $plate = $this->plateKey($movement->plate_number);
            $platesFromMovements[$plate] = true;

            $snapshots[] = [
                'plate' => $plate,
                'date' => $date,
                'status' => $status,
            ];
        }

        $periodIds = Period::query()
            ->whereBetween('date', [$from->toDateString(), $to->toDateString()])
            ->pluck('id');

        if ($periodIds->isNotEmpty()) {
            $records = GpsRecord::query()
                ->with('period:id,date')
                ->whereIn('period_id', $periodIds)
                ->get();

            foreach ($records as $record) {
                $plate = $this->plateKey($record->plate_number);

                if (isset($platesFromMovements[$plate])) {
                    continue;
                }

                $periodDate = $record->period?->date;

                if ($periodDate === null) {
                    continue;
                }

                $date = CarbonImmutable::parse($periodDate)->startOfDay();

                if (! $date->betweenIncluded($from, $to)) {
                    continue;
                }

                $snapshots[] = [
                    'plate' => $plate,
                    'date' => $date,
                    'status' => $this->classifyGps($record->imei, $record->status),
                ];
            }
        }

        return $snapshots;
    }

    /**
     * @param  list<array{plate: string, date: CarbonImmutable, status: string}>  $snapshots
     * @return array{ok: int, falta: int, baja: int, pendiente: int, total: int, percent: int}
     */
    private function summaryForRange(array $snapshots): array
    {
        $byPlate = [];

        foreach ($snapshots as $row) {
            $stamp = $row['date']->getTimestamp();
            $plate = $row['plate'];
            $current = $byPlate[$plate] ?? null;

            if ($current === null || $stamp >= $current['stamp']) {
                $byPlate[$plate] = [
                    'stamp' => $stamp,
                    'status' => $row['status'],
                ];
            }
        }

        $counts = [
            'ok' => 0,
            'falta' => 0,
            'baja' => 0,
            'pendiente' => 0,
        ];

        foreach ($byPlate as $entry) {
            $counts[$entry['status']]++;
        }

        $total = array_sum($counts);

        return [
            ...$counts,
            'total' => $total,
            'percent' => $total > 0 ? (int) round(($counts['ok'] / $total) * 100) : 0,
        ];
    }

    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @param  list<array{plate: string, date: CarbonImmutable, status: string}>  $snapshots
     * @return list<array{label: string, week: int, year: int, ok: int, falta: int, baja: int, pendiente: int, total: int, percent_ok: int}>
     */
    private function weeklyBars(array $range, array $snapshots): array
    {
        [$from, $to] = $this->bounds($range);

        if ($from === null || $to === null) {
            return [];
        }

        $bars = [];
        $cursor = $from->copy()->startOfWeek();
        $end = $to->copy()->endOfWeek();

        while ($cursor <= $end) {
            $weekStart = $cursor->copy()->startOfWeek();
            $weekEnd = $cursor->copy()->endOfWeek();
            $byPlate = [];

            foreach ($snapshots as $row) {
                if ($row['date']->betweenIncluded($weekStart, $weekEnd)) {
                    $byPlate[$row['plate']] = $row['status'];
                }
            }

            $counts = [
                'ok' => 0,
                'falta' => 0,
                'baja' => 0,
                'pendiente' => 0,
            ];

            foreach ($byPlate as $status) {
                $counts[$status]++;
            }

            $total = array_sum($counts);

            if ($total > 0) {
                $bars[] = [
                    'label' => 'Semana '.(int) $weekStart->isoWeek(),
                    'week' => (int) $weekStart->isoWeek(),
                    'year' => (int) $weekStart->isoWeekYear(),
                    'ok' => $counts['ok'],
                    'falta' => $counts['falta'],
                    'baja' => $counts['baja'],
                    'pendiente' => $counts['pendiente'],
                    'total' => $total,
                    'percent_ok' => (int) round(($counts['ok'] / $total) * 100),
                ];
            }

            $cursor = $cursor->addWeek();
        }

        return $bars;
    }

    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @return array{0: CarbonImmutable|null, 1: CarbonImmutable|null}
     */
    private function bounds(array $range): array
    {
        if ($range['from'] === null || $range['to'] === null) {
            return [null, null];
        }

        return [
            CarbonImmutable::parse($range['from'])->startOfDay(),
            CarbonImmutable::parse($range['to'])->endOfDay(),
        ];
    }

    private function plateKey(?string $plate): string
    {
        $normalized = mb_strtoupper(trim((string) $plate));

        return $normalized !== '' ? $normalized : '—';
    }

    /**
     * @return 'ok'|'falta'|'baja'|'pendiente'
     */
    private function classifyRc(RcInsuranceMovement $movement, ?RcInsurance $record): string
    {
        $asOf = CarbonImmutable::parse($movement->service_date)->startOfDay();

        if ($this->rcCompliant($movement->expires_on, $asOf)) {
            return 'ok';
        }

        if ($this->rcMissing($movement, $asOf)) {
            return 'falta';
        }

        if (($record?->status ?? 'active') === 'inactive') {
            return 'baja';
        }

        return 'pendiente';
    }

    /**
     * @return 'ok'|'falta'|'baja'|'pendiente'
     */
    private function classifyRcRecord(RcInsurance $record): string
    {
        $asOf = $record->period?->date !== null
            ? CarbonImmutable::parse($record->period->date)->startOfDay()
            : CarbonImmutable::now()->startOfDay();

        if ($this->rcCompliant($record->expires_on, $asOf)) {
            return 'ok';
        }

        if ($this->rcMissing($record, $asOf)) {
            return 'falta';
        }

        if (($record->status ?? 'active') === 'inactive') {
            return 'baja';
        }

        return 'pendiente';
    }

    private function rcCompliant(mixed $expiresOn, CarbonImmutable $asOf): bool
    {
        if ($expiresOn === null) {
            return false;
        }

        return CarbonImmutable::parse($expiresOn)->startOfDay()->gte($asOf);
    }

    /**
     * @param  RcInsuranceMovement|RcInsurance  $row
     */
    private function rcMissing(object $row, CarbonImmutable $asOf): bool
    {
        if ($row->expires_on !== null) {
            return CarbonImmutable::parse($row->expires_on)->startOfDay()->lt($asOf);
        }

        $procedure = mb_strtolower(trim((string) ($row->procedure ?? '')));

        if ($procedure !== '' && (
            str_contains($procedure, 'venc')
            || str_contains($procedure, 'sin seguro')
            || str_contains($procedure, 'no cuenta')
        )) {
            return true;
        }

        return false;
    }

    /**
     * @return 'ok'|'falta'|'baja'|'pendiente'
     */
    private function classifyGps(?string $imei, ?string $recordStatus): string
    {
        if (trim((string) $imei) !== '') {
            return 'ok';
        }

        if (($recordStatus ?? 'active') === 'inactive') {
            return 'baja';
        }

        return 'falta';
    }
}
