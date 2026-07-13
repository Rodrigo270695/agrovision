<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inspection_evidences', function (Blueprint $table) {
            $table->decimal('latitude', 10, 7)->nullable()->after('caption');
            $table->decimal('longitude', 10, 7)->nullable()->after('latitude');
            $table->decimal('accuracy', 8, 2)->nullable()->after('longitude');
            $table->timestampTz('captured_at')->nullable()->after('accuracy');
        });
    }

    public function down(): void
    {
        Schema::table('inspection_evidences', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'accuracy', 'captured_at']);
        });
    }
};
