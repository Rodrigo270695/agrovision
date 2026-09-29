<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inductions', function (Blueprint $table) {
            $table->foreignId('site_id')->nullable()->after('sede')->constrained('sites')->nullOnDelete();
            $table->foreignId('place_id')->nullable()->after('zone')->constrained('places')->nullOnDelete();
        });

        $sites = DB::table('sites')->get(['id', 'name']);
        $places = DB::table('places')->get(['id', 'site_id', 'name']);

        DB::table('inductions')
            ->select(['id', 'sede', 'zone'])
            ->orderBy('id')
            ->each(function (object $induction) use ($sites, $places): void {
                $site = $sites->first(function (object $item) use ($induction): bool {
                    return $this->sameName($item->name, $induction->sede);
                });

                if (! $site) {
                    return;
                }

                $place = $places->first(function (object $item) use ($induction, $site): bool {
                    return (int) $item->site_id === (int) $site->id
                        && $this->sameName($item->name, $induction->zone);
                });

                DB::table('inductions')->where('id', $induction->id)->update([
                    'site_id' => $site->id,
                    'place_id' => $place?->id,
                ]);
            });
    }

    public function down(): void
    {
        Schema::table('inductions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('place_id');
            $table->dropConstrainedForeignId('site_id');
        });
    }

    private function sameName(mixed $left, mixed $right): bool
    {
        $left = mb_strtolower(trim((string) $left));
        $right = mb_strtolower(trim((string) $right));

        return $left !== '' && $left === $right;
    }
};
