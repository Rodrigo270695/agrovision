<?php

namespace App\Support;

final class InductionStatuses
{
    public const DRAFT = 'draft';

    public const SCHEDULED = 'scheduled';

    public const IN_PROGRESS = 'in_progress';

    public const CLOSED = 'closed';

    public const CANCELLED = 'cancelled';

    /**
     * @return list<string>
     */
    public static function keys(): array
    {
        return [
            self::DRAFT,
            self::SCHEDULED,
            self::IN_PROGRESS,
            self::CLOSED,
            self::CANCELLED,
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function labels(): array
    {
        return [
            self::DRAFT => 'Borrador',
            self::SCHEDULED => 'Programada',
            self::IN_PROGRESS => 'En curso',
            self::CLOSED => 'Cerrada',
            self::CANCELLED => 'Cancelada',
        ];
    }

    public static function label(string $status): string
    {
        return self::labels()[$status] ?? $status;
    }

    public static function isLocked(string $status): bool
    {
        return in_array($status, [self::CLOSED, self::CANCELLED], true);
    }
}
