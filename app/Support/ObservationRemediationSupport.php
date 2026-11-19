<?php

namespace App\Support;

use App\Models\ObservationRemediation;
use App\Models\ObservationRemediationEvent;
use App\Models\UnitChecklist;
use App\Models\UnitChecklistAnswer;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

final class ObservationRemediationSupport
{
    public const TONE_NONE = 'none';

    public const TONE_GREEN = 'green';

    public const TONE_AMBER = 'amber';

    public const TONE_RED = 'red';

    /**
     * @return Builder<UnitChecklist>
     */
    public static function scopedChecklists(): Builder
    {
        $query = UnitChecklist::query()
            ->whereHas('period', fn ($q) => $q->where('status', 'active'));

        // Coordinadores siguen viendo solo sus unidades.
        // Inspectores ven todas las inspecciones / levantamientos.
        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->whereHas('unit', fn ($q) => $q->where('coordinator_id', Auth::id()));
        }

        return $query;
    }

    /**
     * @param  Collection<int, UnitChecklistAnswer>  $answers
     * @return array{percent: float, has_no: bool, grade: string}
     */
    public static function valueField(string $pass): string
    {
        return $pass === 'first' ? 'first_value' : 'second_value';
    }

    public static function currentPassKey(UnitChecklist $checklist): string
    {
        $remediations = $checklist->relationLoaded('observationRemediations')
            ? $checklist->observationRemediations
            : $checklist->observationRemediations()->get();

        $open = $remediations->sortByDesc('id')->first(
            fn ($row) => in_array($row->status, [
                ObservationRemediation::OPEN,
                ObservationRemediation::SUBMITTED,
                ObservationRemediation::REJECTED,
            ], true),
        );

        if ($open !== null) {
            return (string) $open->inspection_pass;
        }

        if ($checklist->second_result !== null || $checklist->second_inspected_on !== null) {
            return 'second';
        }

        return 'first';
    }

    public static function passSnapshot(UnitChecklist $checklist, string $pass): array
    {
        $field = self::valueField($pass);
        $stored = $pass === 'first' ? $checklist->first_result : $checklist->second_result;
        $snap = ParetoPassThreshold::snapshot($checklist->answers, $field);
        $grade = self::effectiveGrade($stored, $snap['percent'], $snap['has_no']);

        return [
            'percent' => $snap['percent'],
            'has_no' => $snap['has_no'],
            'grade' => $grade,
        ];
    }

    public static function effectiveGrade(?string $storedResult, float $percent, bool $hasNo): string
    {
        if ($storedResult === 'rejected') {
            return 'rejected';
        }

        if ($storedResult === 'approved_notes') {
            return 'approved_notes';
        }

        if ($storedResult !== 'approved') {
            return 'pending';
        }

        return ParetoPassThreshold::grade($percent, $hasNo);
    }

    public static function isRemediableGrade(string $grade): bool
    {
        return in_array($grade, ['rejected', 'approved_notes'], true);
    }

    /**
     * @return list<array{pass: string, date: string, grade: string, percent: float, has_no: bool}>
     */
    public static function actionablePasses(UnitChecklist $checklist): array
    {
        return array_values(array_filter(
            self::listedPasses($checklist),
            fn (array $row) => self::isRemediableGrade($row['grade']),
        ));
    }

    /**
     * Incluye aprobadas, c/ obs. y desaprobadas (para calendario y detalle del día).
     *
     * @return list<array{pass: string, date: string, grade: string, percent: float, has_no: bool}>
     */
    public static function listedPasses(UnitChecklist $checklist): array
    {
        $pass = self::currentPassKey($checklist);
        $date = $pass === 'first'
            ? $checklist->first_inspected_on
            : ($checklist->second_inspected_on ?? $checklist->first_inspected_on);

        if ($date === null) {
            return [];
        }

        $snap = self::passSnapshot($checklist, $pass);
        $grade = $snap['grade'];

        if (! in_array($grade, ['rejected', 'approved_notes', 'approved'], true)) {
            return [];
        }

        return [[
            'pass' => $pass,
            'date' => Carbon::parse($date)->toDateString(),
            'grade' => $grade,
            'percent' => $snap['percent'],
            'has_no' => $snap['has_no'],
        ]];
    }

    /**
     * @param  list<int>  $answerIds
     * @return list<array{answer_id: int, item_id: int, from: string, to: string}>
     */
    public static function applyCheckedYes(UnitChecklist $checklist, string $field, array $answerIds): array
    {
        $wanted = array_fill_keys($answerIds, true);
        $changed = [];

        foreach ($checklist->answers as $answer) {
            if (! isset($wanted[(int) $answer->id])) {
                continue;
            }

            $liftsFirst = $answer->first_value === 'no';
            $liftsSecond = $answer->second_value === 'no';
            if (! $liftsFirst && ! $liftsSecond && $answer->{$field} !== 'no') {
                continue;
            }

            if ($liftsFirst) {
                $answer->first_value = 'yes';
            }
            if ($liftsSecond || $answer->{$field} === 'no') {
                $answer->second_value = 'yes';
            }
            $note = trim((string) ($answer->observations ?? ''));
            $stamp = '['.now()->timezone(config('app.timezone'))->format('d/m/Y H:i')
                .'] Ítem levantado en la ronda. Valor anterior: NO.';
            $answer->observations = $note !== '' ? $note."\n".$stamp : $stamp;
            $answer->save();

            $changed[] = [
                'answer_id' => $answer->id,
                'item_id' => $answer->checklist_item_id,
                'from' => 'no',
                'to' => 'yes',
            ];
        }

        return $changed;
    }

    /**
     * La ronda 1 conserva todo lo observado. Cada ronda siguiente
     * solo muestra lo que sigue en NO y lo que se subsanó en esa ronda.
     *
     * @return list<array{number: int, items: list<array{id: int, number: string|null, label: string, group: string|null, status: string}>}>
     */
    public static function roundHistory(UnitChecklist $checklist): array
    {
        $catalog = [];
        $openIds = [];

        foreach ($checklist->answers as $answer) {
            $itemId = (int) $answer->checklist_item_id;
            $catalog[$itemId] = [
                'id' => $itemId,
                'number' => $answer->item?->item_number,
                'label' => $answer->item?->label ?: 'Ítem',
                'group' => $answer->item?->parent?->label,
                'sort' => sprintf(
                    '%05d-%s',
                    (int) ($answer->item?->sort_order ?? 0),
                    (string) ($answer->item?->item_number ?? ''),
                ),
            ];

            if ($answer->first_value === 'no') {
                $openIds[$itemId] = true;
            }
        }

        $lifts = [];
        $remediations = $checklist->relationLoaded('observationRemediations')
            ? $checklist->observationRemediations
            : collect();

        foreach ($remediations->sortBy('id') as $remediation) {
            $events = $remediation->relationLoaded('events')
                ? $remediation->events
                : collect();

            foreach ($events->sortBy('id') as $event) {
                if ($event->event !== 'verified') {
                    continue;
                }

                $payload = is_array($event->payload) ? $event->payload : [];
                $updated = $payload['answers_updated'] ?? [];
                if (! is_array($updated)) {
                    continue;
                }

                $ids = [];
                foreach ($updated as $row) {
                    if (! is_array($row)) {
                        continue;
                    }

                    $itemId = (int) ($row['item_id'] ?? 0);
                    if ($itemId > 0 && isset($catalog[$itemId])) {
                        $ids[$itemId] = true;
                    }
                }

                if ($ids !== []) {
                    $lifts[] = array_keys($ids);
                }
            }
        }

        $original = $openIds;
        foreach ($lifts as $ids) {
            foreach ($ids as $id) {
                $original[$id] = true;
            }
        }

        $rowsFor = function (array $open, array $clearedNow) use ($catalog): array {
            $rows = [];

            foreach ($catalog as $id => $meta) {
                if (! isset($open[$id]) && ! isset($clearedNow[$id])) {
                    continue;
                }

                $rows[] = [
                    'id' => $meta['id'],
                    'number' => $meta['number'],
                    'label' => $meta['label'],
                    'group' => $meta['group'],
                    'sort' => $meta['sort'],
                    'status' => isset($clearedNow[$id]) ? 'cleared' : 'open',
                ];
            }

            usort($rows, fn (array $a, array $b) => strcmp((string) $a['sort'], (string) $b['sort']));

            return array_map(function (array $row) {
                unset($row['sort']);

                return $row;
            }, $rows);
        };

        $stillOpen = $original;
        $rounds = [[
            'number' => 1,
            'items' => $rowsFor($stillOpen, []),
        ]];

        foreach ($lifts as $index => $ids) {
            $clearedNow = [];
            foreach ($ids as $id) {
                if (! isset($stillOpen[$id])) {
                    continue;
                }

                unset($stillOpen[$id]);
                $clearedNow[$id] = true;
            }

            $rounds[] = [
                'number' => $index + 2,
                'items' => $rowsFor($stillOpen, $clearedNow),
            ];
        }

        return $rounds;
    }

    public static function copyFirstIntoSecond(UnitChecklist $checklist): void
    {
        foreach ($checklist->answers as $answer) {
            if ($answer->second_value !== null) {
                continue;
            }

            $answer->second_value = $answer->first_value;
            $answer->save();
        }
    }

    public static function dayTone(array $grades): string
    {
        if ($grades === []) {
            return self::TONE_NONE;
        }

        $hasRed = in_array('rejected', $grades, true);
        $hasAmber = in_array('approved_notes', $grades, true);
        $hasGreen = in_array('approved', $grades, true);
        $kinds = (int) $hasRed + (int) $hasAmber + (int) $hasGreen;

        if ($kinds > 1) {
            return 'mixed';
        }

        if ($hasRed) {
            return self::TONE_RED;
        }

        if ($hasAmber) {
            return self::TONE_AMBER;
        }

        return self::TONE_GREEN;
    }

    /**
     * Solo ítems en NO del pass (paquete a levantar).
     *
     * @return list<array{id: int, checklist_item_id: int, label: string, item_number: mixed, value: string, observations: string|null}>
     */
    public static function observationItems(UnitChecklist $checklist, string $pass): array
    {
        $field = self::valueField($pass);
        $items = [];

        foreach ($checklist->answers as $answer) {
            if ($answer->{$field} !== 'no') {
                continue;
            }

            $text = trim((string) ($answer->observations ?? ''));

            $items[] = [
                'id' => $answer->id,
                'checklist_item_id' => (int) $answer->checklist_item_id,
                'label' => (string) ($answer->item?->label ?? 'Ítem'),
                'item_number' => $answer->item?->item_number,
                'value' => 'no',
                'observations' => $text !== '' ? $text : null,
            ];
        }

        return $items;
    }

    public static function findOrCreate(UnitChecklist $checklist, string $pass): ObservationRemediation
    {
        return ObservationRemediation::query()->firstOrCreate(
            [
                'unit_checklist_id' => $checklist->id,
                'inspection_pass' => $pass,
            ],
            [
                'status' => ObservationRemediation::OPEN,
                'inspector_id' => $checklist->created_by,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function recordEvent(
        ObservationRemediation $remediation,
        string $event,
        ?int $userId = null,
        array $payload = [],
    ): void {
        ObservationRemediationEvent::query()->create([
            'observation_remediation_id' => $remediation->id,
            'event' => $event,
            'user_id' => $userId,
            'payload' => $payload === [] ? null : $payload,
        ]);
    }

    /**
     * Marca todos los ítems en NO como SÍ en el pass y deja historial en observaciones.
     */
    public static function applyFullYes(UnitChecklist $checklist, string $pass): array
    {
        $field = $pass === 'second' ? 'second_value' : 'first_value';
        $changed = [];

        foreach ($checklist->answers as $answer) {
            if ($answer->{$field} !== 'no') {
                continue;
            }

            $previous = $answer->{$field};
            $answer->{$field} = 'yes';

            $note = trim((string) ($answer->observations ?? ''));
            $stamp = '['.now()->timezone(config('app.timezone'))->format('d/m/Y H:i')
                .'] Levantamiento verificado. Valor anterior: NO.';
            $answer->observations = $note !== '' ? $note."\n".$stamp : $stamp;
            $answer->save();

            $changed[] = [
                'answer_id' => $answer->id,
                'item_id' => $answer->checklist_item_id,
                'from' => $previous,
                'to' => 'yes',
            ];
        }

        return $changed;
    }
}
