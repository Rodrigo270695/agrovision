<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Solo para bases que ya tenían units sin period_id.
 * En installs frescos la columna ya viene en create_units_table.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('units') || Schema::hasColumn('units', 'period_id')) {
            return;
        }

        Schema::table('units', function (Blueprint $table) {
            $table->foreignId('period_id')
                ->nullable()
                ->after('id')
                ->constrained('periods')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('units') || ! Schema::hasColumn('units', 'period_id')) {
            return;
        }

        Schema::table('units', function (Blueprint $table) {
            $table->dropConstrainedForeignId('period_id');
        });
    }
};
