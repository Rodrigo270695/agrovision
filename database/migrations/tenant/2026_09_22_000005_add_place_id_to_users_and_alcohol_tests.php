<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('place_id')
                ->nullable()
                ->after('phone')
                ->constrained('places')
                ->nullOnDelete();
        });

        Schema::table('alcohol_tests', function (Blueprint $table) {
            $table->foreignId('place_id')
                ->nullable()
                ->after('location')
                ->constrained('places')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('alcohol_tests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('place_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('place_id');
        });
    }
};
