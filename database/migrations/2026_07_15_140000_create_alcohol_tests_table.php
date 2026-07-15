<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alcohol_tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('period_id')->nullable()->constrained('periods')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('coordinator_id')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamp('tested_at');
            $table->string('driver_name');
            $table->string('driver_dni')->nullable();
            $table->string('plate_number')->nullable();
            $table->decimal('alcohol_level', 6, 3)->default(0);
            $table->boolean('is_positive')->default(false);
            $table->string('location')->nullable();
            $table->text('notes')->nullable();

            $table->string('coordinator_status')->nullable(); // pending | acknowledged
            $table->timestamp('coordinator_notified_at')->nullable();
            $table->text('coordinator_action_plan')->nullable();
            $table->string('coordinator_signer_name')->nullable();
            $table->string('coordinator_signature_path')->nullable();
            $table->timestamp('coordinator_signed_at')->nullable();

            $table->timestamps();

            $table->index(['tested_at']);
            $table->index(['is_positive', 'coordinator_status']);
            $table->index(['coordinator_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alcohol_tests');
    }
};
