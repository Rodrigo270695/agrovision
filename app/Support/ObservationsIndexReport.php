<?php

namespace App\Support;

use App\Models\ChecklistTemplate;
use App\Models\UnitChecklist;
use Carbon\CarbonImmutable;
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
    public function build(string $template, array $range): array
    {
        $templateModel = ChecklistTemplate::query()->where('type', $template)->first();
        $templateLabel = $templateModel?->displayLabel() ?? mb_strtoupper($template);

        $checklists = $this->checklistsInRange($template, $range);
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
                'unit:id,plate_number',
                'answers.item:id,parent_id',
            ])
            ->whereHas('template', fn ($builder) => $builder->where('type', $template))
            ->whereNotNull('first_inspected_on')
            ->whereIn('first_result', ['approved', 'rejected'])
            ->orderByDesc('id');

        if ($range['from'] !== null && $range['to'] !== null) {
            $query->whereBetween('first_inspected_on', [$range['from'], $range['to']]);
        }

        $latest = [];

        foreach ($query->get() as $checklist) {
            $plate = mb_strtoupper(trim((string) ($checklist->unit?->plate_number ?? $checklist->plate_number ?? '')));

            if ($plate === '' || isset($latest[$plate])) {
                continue;
            }

            $latest[$plate] = $checklist;
        }

        return collect(array_values($latest));
    }

    /**
     * @return list<string>
     */
    private function observationFragments(UnitChecklist $checklist): array
    {
        $parts = [];

        foreach ($checklist->answers as $answer) {
            $text = trim((string) ($answer->observations ?? ''));

            if ($text === '') {
                continue;
            }

            foreach ($this->splitFragments($text) as $fragment) {
                $parts[] = $fragment;
            }
        }

        $additional = trim((string) ($checklist->additional_observations ?? ''));

        if ($additional !== '') {
            foreach ($this->splitFragments($additional) as $fragment) {
                $parts[] = $fragment;
            }
        }

        return array_values(array_unique($parts));
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

    private function normalizeKey(string $text): string
    {
        return mb_strtoupper(trim(preg_replace('/\s+/u', ' ', $text) ?? $text));
    }
}
