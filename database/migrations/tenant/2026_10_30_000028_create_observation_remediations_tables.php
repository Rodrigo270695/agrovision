<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('observation_remediations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_checklist_id')->constrained('unit_checklists')->cascadeOnDelete();
            $table->string('inspection_pass', 10);
            $table->string('status', 20)->default('open');
            $table->foreignId('inspector_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('submitted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('submitted_at')->nullable();
            $table->text('submit_note')->nullable();
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('verified_at')->nullable();
            $table->text('rejection_note')->nullable();
            $table->timestamps();

            $table->unique(['unit_checklist_id', 'inspection_pass']);
            $table->index(['status', 'inspector_id']);
        });

        Schema::create('observation_remediation_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('observation_remediation_id')
                ->constrained('observation_remediations')
                ->cascadeOnDelete();
            $table->string('path');
            $table->string('disk')->default('public');
            $table->string('mime_type')->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('observation_remediation_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('observation_remediation_id')
                ->constrained('observation_remediations')
                ->cascadeOnDelete();
            $table->string('event', 50);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['observation_remediation_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('observation_remediation_events');
        Schema::dropIfExists('observation_remediation_photos');
        Schema::dropIfExists('observation_remediations');
    }
};
