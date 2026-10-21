<?php

namespace App\Support;

use App\Models\RcInsuranceStatusEvent;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

final class RcInsuranceStatusHistory
{
    public static function record(int $recordId, string $status, CarbonInterface|string|null $on = null, string $source = 'import'): void
    {
        $date = $on instanceof CarbonInterface
            ? $on->toDateString()
            : Carbon::parse($on ?? now())->toDateString();

        $exists = RcInsuranceStatusEvent::query()
            ->where('rc_insurance_id', $recordId)
            ->where('status', $status)
            ->whereDate('happened_on', $date)
            ->exists();

        if ($exists) {
            return;
        }

        RcInsuranceStatusEvent::query()->create([
            'rc_insurance_id' => $recordId,
            'status' => $status,
            'happened_on' => $date,
            'source' => $source,
        ]);
    }
}
