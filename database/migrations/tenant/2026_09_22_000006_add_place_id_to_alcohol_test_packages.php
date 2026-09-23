<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alcohol_test_packages', function (Blueprint $table) {
            $table->foreignId('place_id')
                ->nullable()
                ->after('notes')
                ->constrained('places')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('alcohol_test_packages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('place_id');
        });
    }
};
