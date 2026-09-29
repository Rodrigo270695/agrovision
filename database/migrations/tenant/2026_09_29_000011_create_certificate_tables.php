<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('certificate_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('induction_id')->constrained('inductions')->cascadeOnDelete();
            $table->string('name');
            $table->string('issuer_name');
            $table->string('issuer_title')->nullable();
            $table->unsignedSmallInteger('validity_months')->default(12);
            $table->string('background_path')->nullable();
            $table->string('signature_path')->nullable();
            $table->json('layout');
            $table->json('custom_variables')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('certificates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('certificate_template_id')->constrained('certificate_templates')->cascadeOnDelete();
            $table->foreignId('induction_id')->constrained('inductions')->cascadeOnDelete();
            $table->foreignId('induction_attendee_id')->constrained('induction_attendees')->cascadeOnDelete();
            $table->string('code')->unique();
            $table->string('token', 64)->unique();
            $table->string('participant_name');
            $table->string('participant_dni')->nullable();
            $table->string('course_title');
            $table->date('session_on')->nullable();
            $table->string('hours')->nullable();
            $table->date('issued_on');
            $table->date('expires_on');
            $table->string('issuer_name');
            $table->string('issuer_title')->nullable();
            $table->json('variables');
            $table->timestamps();

            $table->unique(['certificate_template_id', 'induction_attendee_id'], 'certificates_template_attendee_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('certificates');
        Schema::dropIfExists('certificate_templates');
    }
};
