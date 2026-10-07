<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('central_trainings', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('central_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->constrained('central_trainings')->cascadeOnDelete();
            $table->string('dni', 8);
            $table->string('full_name');
            $table->string('names')->nullable();
            $table->string('paternal_surname')->nullable();
            $table->string('maternal_surname')->nullable();
            $table->timestamps();

            $table->unique(['training_id', 'dni']);
        });

        Schema::create('central_certificate_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('training_id')->nullable()->constrained('central_trainings')->nullOnDelete();
            $table->string('name');
            $table->string('course_title');
            $table->date('expires_on')->nullable();
            $table->string('code_prefix', 20)->default('GIN');
            $table->unsignedInteger('next_sequence')->default(1);
            $table->string('issuer_name')->nullable();
            $table->string('issuer_title')->nullable();
            $table->string('background_path')->nullable();
            $table->string('signature_path')->nullable();
            $table->string('stamp_path')->nullable();
            $table->string('watermark_path')->nullable();
            $table->json('logos')->nullable();
            $table->json('layout')->nullable();
            $table->json('custom_variables')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('central_certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('central_certificate_templates')->cascadeOnDelete();
            $table->foreignId('participant_id')->constrained('central_participants')->cascadeOnDelete();
            $table->string('code')->unique();
            $table->string('token', 64)->unique();
            $table->string('participant_name');
            $table->string('participant_dni', 8);
            $table->string('course_title');
            $table->date('issued_on');
            $table->date('expires_on')->nullable();
            $table->json('variables')->nullable();
            $table->timestamps();

            $table->unique(['template_id', 'participant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('central_certificates');
        Schema::dropIfExists('central_certificate_templates');
        Schema::dropIfExists('central_participants');
        Schema::dropIfExists('central_trainings');
    }
};
