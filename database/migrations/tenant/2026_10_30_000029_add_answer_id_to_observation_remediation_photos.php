<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('observation_remediation_photos', function (Blueprint $table) {
            $table->foreignId('unit_checklist_answer_id')
                ->nullable()
                ->after('observation_remediation_id')
                ->constrained('unit_checklist_answers')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('observation_remediation_photos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('unit_checklist_answer_id');
        });
    }
};
