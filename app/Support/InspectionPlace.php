<?php

namespace App\Support;

use App\Models\Unit;
use App\Models\User;

final class InspectionPlace
{
    /**
     * @return array{sede: string, lugar: string}
     */
    public static function labels(?User $user, ?string $location = null, ?Unit $unit = null): array
    {
        $sede = UnitSede::label($unit?->sede, null, $unit?->coordinator_id);
        $sede = $sede !== '' ? $sede : '—';

        $garita = trim((string) ($unit?->garita ?? ''));
        $lugar = $garita !== '' ? $garita : '—';

        return [
            'sede' => $sede,
            'lugar' => $lugar,
        ];
    }

    /**
     * @return list<string>
     */
    public static function withCreator(): array
    {
        return [
            'creator:id,name,place_id',
            'creator.place.site:id,name',
            'creator.places.site:id,name',
        ];
    }
}
