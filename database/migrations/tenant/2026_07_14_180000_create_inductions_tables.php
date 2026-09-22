<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inductions', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->dateTime('scheduled_at');
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 30)->default('scheduled');
            $table->foreignId('period_id')->nullable()->constrained('periods')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'scheduled_at']);
        });

        Schema::create('induction_attendees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('induction_id')->constrained('inductions')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->string('driver_name');
            $table->string('driver_dni', 20)->nullable();
            $table->string('plate_number', 20)->nullable();
            $table->string('phone', 30)->nullable();
            $table->string('provider')->nullable();
            $table->string('correlative')->nullable();
            $table->string('status', 30)->default('registered');
            $table->timestamp('attended_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['induction_id', 'unit_id']);
            $table->index(['induction_id', 'status']);
            $table->index(['induction_id', 'driver_dni']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('induction_attendees');
        Schema::dropIfExists('inductions');
    }
};
