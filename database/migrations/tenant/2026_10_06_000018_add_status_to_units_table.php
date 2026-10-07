<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('units', 'status')) {
            return;
        }

        Schema::table('units', function (Blueprint $table) {
            $table->string('status', 20)->default('active');
            $table->index('status');
        });
    }

    public function down(): void
    {
        if (! Schema::hasColumn('units', 'status')) {
            return;
        }

        Schema::table('units', function (Blueprint $table) {
            $table->dropIndex(['status']);
            $table->dropColumn('status');
        });
    }
};
