<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vehicle_types', function (Blueprint $table) {
            $table->foreignId('checklist_template_id')
                ->nullable()
                ->after('sort')
                ->constrained('checklist_templates')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('vehicle_types', function (Blueprint $table) {
            $table->dropConstrainedForeignId('checklist_template_id');
        });
    }
};
