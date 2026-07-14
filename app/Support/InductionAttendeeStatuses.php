<?php

namespace App\Support;

final class InductionAttendeeStatuses
{
    public const REGISTERED = 'registered';

    public const ATTENDED = 'attended';

    public const ABSENT = 'absent';

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return [
            self::REGISTERED,
            self::ATTENDED,
            self::ABSENT,
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            self::REGISTERED => 'Inscrito',
            self::ATTENDED => 'Asistió',
            self::ABSENT => 'No asistió',
        ];
    }

    public static function label(string $status): string
    {
        return self::labels()[$status] ?? $status;
    }
}
