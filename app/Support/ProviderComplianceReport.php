<?php

namespace App\Support;

use App\Models\ChecklistTemplate;
use App\Models\UnitChecklist;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class ProviderComplianceReport
{
    /**
     * @return array{
     *     year: int,
     *     week: int,
     *     week_label: string,
     *     units: list<array{provider: string, plate: string, percent: int, label: string}>,
     *     weekly_bars: list<array{label: string, week: int, year: int, percent_ok: int, total: int}>,
     *     available_weeks: list<int>,
     *     template: string,
     *     template_label: string
     * }
     */
    public function build(int $year, int $week, string $template): array
    {
        $week = max(1, min(53, $week));
        $year = max(2000, min(2100, $year));

        $templateModel = ChecklistTemplate::query()->where('type', $template)->first();
        $templateLabel = $templateModel?->displayLabel() ?? mb_strtoupper($template);

        $checklists = $this->checklistsForYear($template, $year);
        $availableWeeks = $this->weeksWithData($checklists);

        if ($availableWeeks !== [] && ! in_array($week, $availableWeeks, true)) {
            $week = $availableWeeks[array_key_last($availableWeeks)];
        }

        $weekStart = CarbonImmutable::now()->setISODate($year, $week)->startOfWeek();
        $weekEnd = $weekStart->endOfWeek();

        $units = $this->unitsForWeek($checklists, $weekStart, $weekEnd);
        $weeklyBars = $this->weeklyBars($checklists, $year);

        return [
            'year' => $year,
            'week' => $week,
            'week_label' => sprintf('Semana %d · %d', $week, $year),
            'units' => $units,
            'weekly_bars' => $weeklyBars,
            'available_weeks' => $availableWeeks,
            'template' => $template,
            'template_label' => $templateLabel,
        ];
    }

    /**
     * @return Collection<int, UnitChecklist>
     */
    private function checklistsForYear(string $template, int $year): Collection
    {
        $from = CarbonImmutable::create($year, 1, 1)->startOfYear();
        $to = CarbonImmutable::create($year, 12, 31)->endOfYear();

        return UnitChecklist::query()
            ->with([
                'unit:id,provider,plate_number,status',
                'answers.item:id,weight,parent_id',
            ])
            ->whereHas('template', fn ($builder) => $builder->where('type', $template))
            ->whereNotNull('first_inspected_on')
            ->whereBetween('first_inspected_on', [$from->toDateString(), $to->toDateString()])
            ->whereIn('first_result', ['approved', 'rejected'])
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  Collection<int, UnitChecklist>  $checklists
     * @return list<int>
     */
    private function weeksWithData(Collection $checklists): array
    {
        $weeks = [];

        foreach ($checklists as $checklist) {
            if ($checklist->first_inspected_on === null) {
                continue;
            }

            $date = CarbonImmutable::parse($checklist->first_inspected_on);
            $weeks[$date->isoWeek()] = true;
        }

        $sorted = array_keys($weeks);
        sort($sorted, SORT_NUMERIC);

        return $sorted;
    }

    /**
     * @param  Collection<int, UnitChecklist>  $checklists
     * @return list<array{provider: string, plate: string, percent: int, label: string}>
     */
    private function unitsForWeek(Collection $checklists, CarbonImmutable $weekStart, CarbonImmutable $weekEnd): array
    {
        $byPlate = [];

        foreach ($checklists as $checklist) {
            if ($checklist->first_inspected_on === null) {
                continue;
            }

            $date = CarbonImmutable::parse($checklist->first_inspected_on)->startOfDay();

            if (! $date->betweenIncluded($weekStart, $weekEnd)) {
                continue;
            }

            $plate = mb_strtoupper(trim((string) ($checklist->unit?->plate_number ?? $checklist->plate_number ?? '')));

            if ($plate === '') {
                $plate = 'unit-'.$checklist->unit_id;
            }

            if (isset($byPlate[$plate])) {
                continue;
            }

            $percent = (int) round($this->paretoPercent($checklist));
            $provider = trim((string) ($checklist->unit?->provider ?? ''));
            $provider = $provider !== '' ? $provider : 'Sin proveedor';

            $byPlate[$plate] = [
                'provider' => $provider,
                'plate' => $plate,
                'percent' => $percent,
                'label' => $provider,
            ];
        }

        $rows = array_values($byPlate);
        usort($rows, fn (array $a, array $b) => strcmp($a['provider'], $b['provider']) ?: strcmp($a['plate'], $b['plate']));

        return $rows;
    }

    /**
     * @param  Collection<int, UnitChecklist>  $checklists
     * @return list<array{label: string, week: int, year: int, percent_ok: int, total: int}>
     */
    private function weeklyBars(Collection $checklists, int $year): array
    {
        $bars = [];

        for ($week = 1; $week <= 53; $week++) {
            try {
                $weekStart = CarbonImmutable::now()->setISODate($year, $week)->startOfWeek();
            } catch (\Throwable) {
                break;
            }

            if ((int) $weekStart->isoWeekYear() !== $year) {
                continue;
            }

            $weekEnd = $weekStart->endOfWeek();
            $units = $this->unitsForWeek($checklists, $weekStart, $weekEnd);

            if ($units === []) {
                continue;
            }

            $sum = array_sum(array_column($units, 'percent'));
            $avg = (int) round($sum / count($units));

            $bars[] = [
                'label' => 'Semana '.$week,
                'week' => $week,
                'year' => $year,
                'percent_ok' => $avg,
                'total' => count($units),
            ];
        }

        return $bars;
    }

    private function paretoPercent(UnitChecklist $checklist): float
    {
        $field = $checklist->second_result !== null ? 'second_value' : 'first_value';
        $snapshot = ParetoPassThreshold::snapshot($checklist->answers, $field);

        return $snapshot['percent'];
    }
}
