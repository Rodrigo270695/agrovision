<?php

namespace App\Support;

use App\Models\ChecklistTemplate;
use App\Models\UnitChecklist;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class ProviderComplianceReport
{
    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @return array{
     *     week: int|null,
     *     week_year: int|null,
     *     week_label: string,
     *     units: list<array{provider: string, plate: string, percent: int, label: string}>,
     *     weekly_bars: list<array{label: string, week: int, year: int, percent_ok: int, total: int}>,
     *     available_weeks: list<array{week: int, year: int}>,
     *     template: string,
     *     template_label: string
     * }
     */
    public function build(string $template, array $range, ?int $week, ?int $weekYear): array
    {
        $templateModel = ChecklistTemplate::query()->where('type', $template)->first();
        $templateLabel = $templateModel?->displayLabel() ?? mb_strtoupper($template);

        $checklists = $this->checklistsInRange($template, $range);
        $availableWeeks = ReportWeekSupport::weeksWithInspections($checklists);
        $selected = ReportWeekSupport::resolveWeek($week, $weekYear, $availableWeeks);

        $units = [];

        if ($selected !== null) {
            [$weekStart, $weekEnd] = ReportWeekSupport::weekBounds($selected['year'], $selected['week']);
            $units = $this->unitsForWeek($checklists, $weekStart, $weekEnd);
        }

        $weeklyBars = $this->weeklyBars($checklists, $availableWeeks);

        $weekLabel = $selected !== null
            ? sprintf('Semana %d · %d', $selected['week'], $selected['year'])
            : $range['label'];

        return [
            'week' => $selected['week'] ?? null,
            'week_year' => $selected['year'] ?? null,
            'week_label' => $weekLabel,
            'units' => $units,
            'weekly_bars' => $weeklyBars,
            'available_weeks' => $availableWeeks,
            'template' => $template,
            'template_label' => $templateLabel,
        ];
    }

    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @return Collection<int, UnitChecklist>
     */
    private function checklistsInRange(string $template, array $range): Collection
    {
        $query = UnitChecklist::query()
            ->with([
                'unit:id,provider,plate_number,status',
                'answers.item:id,weight,parent_id',
            ])
            ->whereHas('template', fn ($builder) => $builder->where('type', $template))
            ->whereNotNull('first_inspected_on')
            ->whereIn('first_result', ['approved', 'rejected'])
            ->orderByDesc('id');

        if ($range['from'] !== null && $range['to'] !== null) {
            $query->whereBetween('first_inspected_on', [$range['from'], $range['to']]);
        }

        return $query->get();
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
     * @param  list<array{week: int, year: int}>  $availableWeeks
     * @return list<array{label: string, week: int, year: int, percent_ok: int, total: int}>
     */
    private function weeklyBars(Collection $checklists, array $availableWeeks): array
    {
        $bars = [];

        foreach ($availableWeeks as $entry) {
            [$weekStart, $weekEnd] = ReportWeekSupport::weekBounds($entry['year'], $entry['week']);
            $units = $this->unitsForWeek($checklists, $weekStart, $weekEnd);

            if ($units === []) {
                continue;
            }

            $sum = array_sum(array_column($units, 'percent'));
            $avg = (int) round($sum / count($units));

            $bars[] = [
                'label' => 'Semana '.$entry['week'],
                'week' => $entry['week'],
                'year' => $entry['year'],
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
