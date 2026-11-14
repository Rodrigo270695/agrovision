<?php

namespace App\Support;

use App\Models\UnitStatusEvent;
use Carbon\CarbonInterface;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Schema;

final class UnitStatusHistory
{
    public static function ensure(): void
    {
        self::ensureTable();
    }

    public static function record(int $unitId, string $status, CarbonInterface|string|null $on = null, string $source = 'manual'): ?int
    {
        self::ensureTable();

        $date = $on instanceof CarbonInterface
            ? $on->toDateString()
            : Carbon::parse($on ?? now())->toDateString();

        $existing = UnitStatusEvent::query()
            ->where('unit_id', $unitId)
            ->where('status', $status)
            ->whereDate('happened_on', $date)
            ->value('id');

        if ($existing) {
            return (int) $existing;
        }

        return (int) UnitStatusEvent::query()->create([
            'unit_id' => $unitId,
            'status' => $status,
            'happened_on' => $date,
            'source' => $source,
        ])->id;
    }

    private static function ensureTable(): void
    {
        if (Schema::hasTable('unit_status_events')) {
            return;
        }

        Schema::create('unit_status_events', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->string('status', 20);
            $table->date('happened_on');
            $table->string('source', 20)->default('manual');
            $table->timestamps();
            $table->index(['unit_id', 'happened_on']);
        });
    }
}
