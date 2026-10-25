<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table) {
            $table->string('sede')->nullable()->after('phone');
            $table->string('garita')->nullable()->after('plate_number');
        });

        Schema::table('unit_movements', function (Blueprint $table) {
            $table->string('sede')->nullable()->after('phone');
            $table->string('garita')->nullable()->after('plate_number');
        });
    }

    public function down(): void
    {
        Schema::table('unit_movements', function (Blueprint $table) {
            $table->dropColumn(['sede', 'garita']);
        });

        Schema::table('units', function (Blueprint $table) {
            $table->dropColumn(['sede', 'garita']);
        });
    }
};
