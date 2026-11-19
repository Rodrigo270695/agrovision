<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('unit_checklists') || Schema::hasColumn('unit_checklists', 'round_number')) {
            return;
        }

        Schema::table('unit_checklists', function (Blueprint $table) {
            $table->unsignedSmallInteger('round_number')->default(1);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('unit_checklists') || ! Schema::hasColumn('unit_checklists', 'round_number')) {
            return;
        }

        Schema::table('unit_checklists', function (Blueprint $table) {
            $table->dropColumn('round_number');
        });
    }
};
