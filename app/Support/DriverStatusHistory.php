<?php

namespace App\Support;

use App\Models\DriverStatusEvent;
use Carbon\CarbonInterface;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

final class DriverStatusHistory
{
    public static function record(int $driverId, string $status, CarbonInterface|string|null $on = null, string $source = 'manual'): void
    {
        self::ensureTable();

        $date = $on instanceof CarbonInterface
            ? $on->toDateString()
            : Carbon::parse($on ?? now())->toDateString();

        $exists = DriverStatusEvent::query()
            ->where('driver_id', $driverId)
            ->where('status', $status)
            ->whereDate('happened_on', $date)
            ->exists();

        if ($exists) {
            return;
        }

        DriverStatusEvent::query()->create([
            'driver_id' => $driverId,
            'status' => $status,
            'happened_on' => $date,
            'source' => $source,
        ]);
    }

    private static function ensureTable(): void
    {
        if (Schema::hasTable('driver_status_events')) {
            return;
        }

        Schema::create('driver_status_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->string('status', 20);
            $table->date('happened_on');
            $table->string('source', 20)->default('manual');
            $table->timestamps();
            $table->index(['driver_id', 'happened_on']);
        });
    }
}
