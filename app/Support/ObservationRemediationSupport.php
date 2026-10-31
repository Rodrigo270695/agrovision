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

        $user = Auth::user();

        if (SystemRoles::currentIsScopedCoordinator()) {
            $query->whereHas('unit', fn ($q) => $q->where('coordinator_id', Auth::id()));
        } elseif (
            $user
            && $user->hasRole(SystemRoles::INSPECTOR)
            && ! $user->hasRole(SystemRoles::SUPERADMIN)
        ) {
            $query->where('created_by', $user->id);
        }

        return $query;
    }

    /**
     * @param  Collection<int, UnitChecklistAnswer>  $answers
     * @return array{percent: float, has_no: bool, grade: string}
     */
    public static function passSnapshot(UnitChecklist $checklist, string $pass): array
    {
        $field = $pass === 'second' ? 'second_value' : 'first_value';
        $stored = $pass === 'second' ? $checklist->second_result : $checklist->first_result;
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

    /**
     * @return list<array{pass: string, date: string, grade: string, percent: float, has_no: bool}>
     */
    public static function actionablePasses(UnitChecklist $checklist): array
    {
        return array_values(array_filter(
            self::listedPasses($checklist),
            fn (array $row) => in_array($row['grade'], ['rejected', 'approved_notes'], true),
        ));
    }

    /**
     * Incluye aprobadas, c/ obs. y desaprobadas (para calendario y detalle del día).
     *
     * @return list<array{pass: string, date: string, grade: string, percent: float, has_no: bool}>
     */
    public static function listedPasses(UnitChecklist $checklist): array
    {
        $out = [];

        foreach (['first', 'second'] as $pass) {
            $date = $pass === 'second'
                ? $checklist->second_inspected_on
                : $checklist->first_inspected_on;

            if ($date === null) {
                continue;
            }

            $snap = self::passSnapshot($checklist, $pass);
            $remediation = $checklist->relationLoaded('observationRemediations')
                ? $checklist->observationRemediations->firstWhere('inspection_pass', $pass)
                : null;

            $grade = $snap['grade'];

            if ($grade === 'approved_notes'
                && $remediation?->status === ObservationRemediation::VERIFIED
            ) {
                $grade = 'approved';
            }

            if (! in_array($grade, ['rejected', 'approved_notes', 'approved'], true)) {
                continue;
            }

            $out[] = [
                'pass' => $pass,
                'date' => Carbon::parse($date)->toDateString(),
                'grade' => $grade,
                'percent' => $snap['percent'],
                'has_no' => $snap['has_no'],
            ];
        }

        return $out;
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
        $field = $pass === 'second' ? 'second_value' : 'first_value';
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
