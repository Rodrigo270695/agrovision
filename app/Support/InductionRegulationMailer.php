<?php

namespace App\Support;

use App\Mail\InductionRegulationsMail;
use App\Models\Induction;
use App\Models\User;
use Illuminate\Support\Facades\Mail;

final class InductionRegulationMailer
{
    /**
     * @param  list<int>|null  $coordinatorIds  null envía a todos los coordinadores de los asistentes
     * @return array{files: int, sent: int, skipped: int, failed: int}
     */
    public static function send(Induction $induction, ?array $coordinatorIds = null): array
    {
        $regulations = $induction->regulations()->get();
        $result = [
            'files' => $regulations->count(),
            'sent' => 0,
            'skipped' => 0,
            'failed' => 0,
        ];

        if ($regulations->isEmpty()) {
            return $result;
        }

        $attendees = $induction->attendees()
            ->with(['unit.coordinatorUser:id,name,email'])
            ->get();

        /** @var array<int, array{user: User, drivers: list<array{name: string, dni: string|null, plate: string|null}>}> $groups */
        $groups = [];

        foreach ($attendees as $attendee) {
            $coordinator = $attendee->unit?->coordinatorUser;
            $coordinatorId = (int) ($coordinator?->id ?? 0);

            if ($coordinatorIds !== null && ! in_array($coordinatorId, $coordinatorIds, true)) {
                continue;
            }

            if (! $coordinator || ! filter_var($coordinator->email, FILTER_VALIDATE_EMAIL)) {
                $result['skipped']++;

                continue;
            }

            $groups[$coordinator->id]['user'] = $coordinator;
            $groups[$coordinator->id]['drivers'][] = [
                'name' => $attendee->driver_name,
                'dni' => $attendee->driver_dni,
                'plate' => $attendee->plate_number,
            ];
        }

        foreach ($groups as $group) {
            try {
                Mail::to($group['user']->email)->send(new InductionRegulationsMail(
                    $induction,
                    $group['user']->name,
                    $group['drivers'],
                    $regulations,
                ));
                $result['sent']++;
            } catch (\Throwable $exception) {
                report($exception);
                $result['failed']++;
            }
        }

        return $result;
    }

    public static function sentence(array $result, bool $mentionMissingFiles = false): string
    {
        if ($result['files'] === 0) {
            return $mentionMissingFiles
                ? ' Sube los reglamentos en PDF para enviarlos a los coordinadores.'
                : '';
        }

        if ($result['sent'] === 0 && $result['failed'] === 0) {
            return ' No se envió correo: los conductores no tienen coordinador con correo.';
        }

        $text = " Se envió el correo con los reglamentos a {$result['sent']} coordinador(es).";

        if ($result['skipped'] > 0) {
            $text .= " {$result['skipped']} conductor(es) quedaron sin envío.";
        }

        if ($result['failed'] > 0) {
            $text .= " {$result['failed']} correo(s) fallaron.";
        }

        return $text;
    }
}
