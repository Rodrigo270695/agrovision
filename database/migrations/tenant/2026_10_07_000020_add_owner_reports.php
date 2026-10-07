<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('inspector_quotas')) {
            Schema::create('inspector_quotas', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete();
                $table->unsignedSmallInteger('daily_quota');
                $table->timestamps();
            });
        }

        Schema::table('unit_checklists', function (Blueprint $table) {
            if (! Schema::hasColumn('unit_checklists', 'started_at')) {
                $table->timestamp('started_at')->nullable();
            }

            if (! Schema::hasColumn('unit_checklists', 'finished_at')) {
                $table->timestamp('finished_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('unit_checklists', function (Blueprint $table) {
            if (Schema::hasColumn('unit_checklists', 'finished_at')) {
                $table->dropColumn('finished_at');
            }

            if (Schema::hasColumn('unit_checklists', 'started_at')) {
                $table->dropColumn('started_at');
            }
        });

        Schema::dropIfExists('inspector_quotas');
    }
};
