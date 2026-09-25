<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_checklists', function (Blueprint $table) {
            $table->dropUnique('unit_checklists_unique');
            $table->unique(
                ['unit_id', 'template_id', 'period_id', 'first_inspected_on'],
                'unit_checklists_day_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::table('unit_checklists', function (Blueprint $table) {
            $table->dropUnique('unit_checklists_day_unique');
            $table->unique(['unit_id', 'template_id', 'period_id'], 'unit_checklists_unique');
        });
    }
};
