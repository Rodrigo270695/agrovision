<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('places', function (Blueprint $table) {
            $table->foreignId('site_id')
                ->nullable()
                ->after('id')
                ->constrained('sites')
                ->nullOnDelete();
        });

        if (DB::table('places')->whereNull('site_id')->exists()) {
            $now = now();
            $siteId = DB::table('sites')->insertGetId([
                'name' => 'Sede principal',
                'description' => null,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('places')->whereNull('site_id')->update([
                'site_id' => $siteId,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('places', function (Blueprint $table) {
            $table->dropConstrainedForeignId('site_id');
        });
    }
};
