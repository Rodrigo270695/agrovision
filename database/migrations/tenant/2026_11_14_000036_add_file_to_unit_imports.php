<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('unit_imports')) {
            return;
        }

        $missing = array_values(array_filter(
            ['original_name', 'file_path', 'file_disk'],
            fn (string $column): bool => ! Schema::hasColumn('unit_imports', $column),
        ));

        if ($missing === []) {
            return;
        }

        Schema::table('unit_imports', function (Blueprint $table) use ($missing) {
            if (in_array('original_name', $missing, true)) {
                $table->string('original_name')->nullable();
            }

            if (in_array('file_path', $missing, true)) {
                $table->string('file_path')->nullable();
            }

            if (in_array('file_disk', $missing, true)) {
                $table->string('file_disk', 20)->default('local');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('unit_imports')) {
            return;
        }

        Schema::table('unit_imports', function (Blueprint $table) {
            foreach (['original_name', 'file_path', 'file_disk'] as $column) {
                if (Schema::hasColumn('unit_imports', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
