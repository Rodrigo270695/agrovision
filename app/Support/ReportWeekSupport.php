<?php

namespace App\Support;

use App\Models\UnitChecklist;
use Carbon\CarbonImmutable;
use Illuminate\Support\Collection;

final class ReportWeekSupport
{
    /**
     * @param  Collection<int, UnitChecklist>  $checklists
     * @return list<array{week: int, year: int}>
     */
    public static function weeksWithInspections(Collection $checklists): array
    {
        $weeks = [];

        foreach ($checklists as $checklist) {
            if ($checklist->first_inspected_on === null) {
                continue;
            }

            $date = CarbonImmutable::parse($checklist->first_inspected_on);
            $key = $date->isoWeekYear().'-'.$date->isoWeek();
            $weeks[$key] = [
                'week' => (int) $date->isoWeek(),
                'year' => (int) $date->isoWeekYear(),
            ];
        }

        $list = array_values($weeks);

        usort(
            $list,
            fn (array $a, array $b) => $a['year'] <=> $b['year'] ?: $a['week'] <=> $b['week'],
        );

        return $list;
    }

    /**
     * @param  list<array{week: int, year: int}>  $available
     * @return array{week: int, year: int}|null
     */
    public static function resolveWeek(?int $week, ?int $weekYear, array $available): ?array
    {
        if ($available === []) {
            return null;
        }

        if ($week !== null && $weekYear !== null) {
            foreach ($available as $entry) {
                if ($entry['week'] === $week && $entry['year'] === $weekYear) {
                    return $entry;
                }
            }
        }

        return $available[array_key_last($available)];
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public static function weekBounds(int $year, int $week): array
    {
        $start = CarbonImmutable::now()->setISODate($year, $week)->startOfWeek();

        return [$start, $start->endOfWeek()];
    }

    public static function inIsoWeek(CarbonImmutable $date, int $week, int $year): bool
    {
        return (int) $date->isoWeek() === $week && (int) $date->isoWeekYear() === $year;
    }
}
