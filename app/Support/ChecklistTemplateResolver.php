<?php

namespace App\Support;

use App\Models\ChecklistTemplate;
use App\Models\VehicleType;

final class ChecklistTemplateResolver
{
    public static function forVehicleName(?string $vehicleType): ?ChecklistTemplate
    {
        $normalized = mb_strtoupper(trim((string) $vehicleType));

        if ($normalized === '') {
            return null;
        }

        $type = VehicleType::query()
            ->with(['checklistTemplate' => fn ($query) => $query->where('is_active', true)])
            ->whereRaw('upper(name) = ?', [$normalized])
            ->first();

        $template = $type?->checklistTemplate;

        return $template?->is_active ? $template : null;
    }
}
