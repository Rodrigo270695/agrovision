<?php

namespace App\Support;

use App\Models\ChecklistTemplate;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistAnswer;
use Illuminate\Support\Collection;

final class ObservationsIndexReport
{
    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @return array{
     *     rows: list<array{observation: string, count: int, plates: list<string>}>,
     *     units_with_observations: int,
     *     template: string,
     *     template_label: string
     * }
     */
    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     */
    public function build(string $template, array $range, ?int $week, ?int $weekYear): array
    {
        $templateModel = ChecklistTemplate::query()->where('type', $template)->first();
        $templateLabel = $templateModel?->displayLabel() ?? mb_strtoupper($template);

        $scoped = $this->baseChecklistsInRange($template, $range);
        $availableWeeks = ReportWeekSupport::weeksWithInspections($scoped);

        if ($week !== null && $weekYear !== null) {
            $scoped = $scoped->filter(function (UnitChecklist $checklist) use ($week, $weekYear) {
                if ($checklist->first_inspected_on === null) {
                    return false;
                }

                return ReportWeekSupport::inIsoWeek(
                    \Carbon\CarbonImmutable::parse($checklist->first_inspected_on),
                    $week,
                    $weekYear,
                );
            })->values();
        }

        $checklists = $this->latestPerPlate($scoped);
        $index = [];
        $platesTouched = [];

        foreach ($checklists as $checklist) {
            $plate = mb_strtoupper(trim((string) ($checklist->unit?->plate_number ?? $checklist->plate_number ?? '')));

            if ($plate === '') {
                continue;
            }

            $fragments = $this->observationFragments($checklist);

            if ($fragments === []) {
                continue;
            }

            $platesTouched[$plate] = true;

            foreach ($fragments as $text) {
                $key = $this->normalizeKey($text);

                if (! isset($index[$key])) {
                    $index[$key] = [
                        'observation' => $text,
                        'plates' => [],
                    ];
                }

                $index[$key]['plates'][$plate] = true;
            }
        }

        $rows = [];

        foreach ($index as $entry) {
            $plates = array_keys($entry['plates']);
            sort($plates, SORT_STRING);

            $rows[] = [
                'observation' => $entry['observation'],
                'count' => count($plates),
                'plates' => $plates,
            ];
        }

        usort($rows, fn (array $a, array $b) => $b['count'] <=> $a['count'] ?: strcmp($a['observation'], $b['observation']));

        return [
            'rows' => $rows,
            'units_with_observations' => count($platesTouched),
            'available_weeks' => $availableWeeks,
            'week' => $week,
            'week_year' => $weekYear,
            'template' => $template,
            'template_label' => $templateLabel,
        ];
    }

    /**
     * @param  Collection<int, UnitChecklist>  $checklists
     * @return Collection<int, UnitChecklist>
     */
    private function latestPerPlate(Collection $checklists): Collection
    {
        $latest = [];

        foreach ($checklists as $checklist) {
            $plate = mb_strtoupper(trim((string) ($checklist->unit?->plate_number ?? $checklist->plate_number ?? '')));

            if ($plate === '' || isset($latest[$plate])) {
                continue;
            }

            $latest[$plate] = $checklist;
        }

        return collect(array_values($latest));
    }

    /**
     * @param  array{from: string|null, to: string|null, label: string}  $range
     * @return Collection<int, UnitChecklist>
     */
    private function baseChecklistsInRange(string $template, array $range): Collection
    {
        $query = UnitChecklist::query()
            ->with([
                'unit:id,plate_number',
                'answers.item:id,parent_id,label,check_type,has_expiry,weight',
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
     * @return list<string>
     */
    private function observationFragments(UnitChecklist $checklist): array
    {
        $parts = [];
        $valueField = $checklist->second_result !== null ? 'second_value' : 'first_value';

        foreach ($checklist->answers as $answer) {
            foreach ($this->fragmentsFromAnswer($answer, $valueField) as $fragment) {
                $parts[] = $fragment;
            }
        }

        $additional = trim((string) ($checklist->additional_observations ?? ''));

        if ($additional !== '') {
            foreach ($this->splitFragments($additional) as $fragment) {
                if (! $this->looksLikeDate($fragment)) {
                    $parts[] = $fragment;
                }
            }
        }

        $unique = [];

        foreach ($parts as $part) {
            $key = $this->normalizeKey($part);
            $unique[$key] = $part;
        }

        return array_values($unique);
    }

    /**
     * @return list<string>
     */
    private function fragmentsFromAnswer(UnitChecklistAnswer $answer, string $valueField): array
    {
        $item = $answer->item;

        if ($item === null) {
            return [];
        }

        $value = $answer->{$valueField};
        $checkType = $item->resolvedCheckType();
        $fragments = [];

        if ($value === 'no') {
            $label = trim((string) $item->label);

            if ($label !== '') {
                $fragments[] = $label;
            }
        }

        if ($checkType === ParetoCheckTypes::EXPIRY) {
            return $fragments;
        }

        $text = trim((string) ($answer->observations ?? ''));

        if ($text === '' || $this->looksLikeDate($text)) {
            return $fragments;
        }

        foreach ($this->splitFragments($text) as $fragment) {
            if (! $this->looksLikeDate($fragment)) {
                $fragments[] = $fragment;
            }
        }

        return $fragments;
    }

    /**
     * @return list<string>
     */
    private function splitFragments(string $text): array
    {
        $chunks = preg_split('/[\r\n,;]+/u', $text) ?: [];

        return array_values(array_filter(array_map(function (string $part): string {
            return trim(preg_replace('/\s+/u', ' ', $part) ?? $part);
        }, $chunks), fn (string $part) => $part !== ''));
    }

    private function looksLikeDate(string $text): bool
    {
        $text = trim($text);

        if ($text === '') {
            return false;
        }

        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $text) === 1) {
            return true;
        }

        if (preg_match('/^\d{1,2}\/\d{1,2}\/\d{2,4}$/', $text) === 1) {
            return true;
        }

        if (preg_match('/^\d{1,2}-\d{1,2}-\d{2,4}$/', $text) === 1) {
            return true;
        }

        return false;
    }

    private function normalizeKey(string $text): string
    {
        return mb_strtoupper(trim(preg_replace('/\s+/u', ' ', $text) ?? $text));
    }
}
