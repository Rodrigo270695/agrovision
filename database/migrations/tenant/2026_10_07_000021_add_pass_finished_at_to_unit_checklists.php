<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_checklists', function (Blueprint $table) {
            if (! Schema::hasColumn('unit_checklists', 'first_finished_at')) {
                $table->timestamp('first_finished_at')->nullable();
            }

            if (! Schema::hasColumn('unit_checklists', 'second_finished_at')) {
                $table->timestamp('second_finished_at')->nullable();
            }
        });

        DB::table('unit_checklists')
            ->whereIn('first_result', ['approved', 'rejected'])
            ->whereNull('first_finished_at')
            ->where(function ($query) {
                $query
                    ->whereNull('second_result')
                    ->orWhereNotIn('second_result', ['approved', 'rejected']);
            })
            ->update(['first_finished_at' => DB::raw('updated_at')]);

        DB::table('unit_checklists')
            ->whereIn('second_result', ['approved', 'rejected'])
            ->whereNull('second_finished_at')
            ->update(['second_finished_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        Schema::table('unit_checklists', function (Blueprint $table) {
            if (Schema::hasColumn('unit_checklists', 'second_finished_at')) {
                $table->dropColumn('second_finished_at');
            }

            if (Schema::hasColumn('unit_checklists', 'first_finished_at')) {
                $table->dropColumn('first_finished_at');
            }
        });
    }
};
