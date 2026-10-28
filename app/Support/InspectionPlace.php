<?php

namespace App\Support;

use App\Models\Place;
use App\Models\Unit;
use App\Models\User;

final class InspectionPlace
{
    /**
     * @return array{sede: string, lugar: string}
     */
    public static function labels(?User $user, ?string $location = null, ?Unit $unit = null): array
    {
        $places = $user !== null && $user->relationLoaded('places')
            ? $user->places
            : collect();

        if ($places->isEmpty() && $user?->place) {
            $places = collect([$user->place]);
        }

        $sede = UnitSede::label($unit?->sede, null, $unit?->coordinator_id);
        $sede = $sede !== '' ? $sede : '—';

        $lugares = $places
            ->map(fn (Place $place) => trim((string) $place->name))
            ->filter()
            ->unique()
            ->values();

        $lugar = $lugares->isNotEmpty()
            ? $lugares->implode(', ')
            : trim((string) $location);

        return [
            'sede' => $sede,
            'lugar' => $lugar !== '' ? $lugar : '—',
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
