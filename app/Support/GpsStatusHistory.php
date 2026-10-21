<?php

namespace App\Support;

use App\Models\GpsStatusEvent;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

final class GpsStatusHistory
{
    public static function record(int $recordId, string $status, CarbonInterface|string|null $on = null, string $source = 'import'): void
    {
        $date = $on instanceof CarbonInterface
            ? $on->toDateString()
            : Carbon::parse($on ?? now())->toDateString();

        $exists = GpsStatusEvent::query()
            ->where('gps_record_id', $recordId)
            ->where('status', $status)
            ->whereDate('happened_on', $date)
            ->exists();

        if ($exists) {
            return;
        }

        GpsStatusEvent::query()->create([
            'gps_record_id' => $recordId,
            'status' => $status,
            'happened_on' => $date,
            'source' => $source,
        ]);
    }
}
