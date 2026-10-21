<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('drivers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('periods')->cascadeOnDelete();
            $table->string('identity_key', 120);
            $table->string('driver_dni', 20)->nullable();
            $table->string('driver_name');
            $table->foreignId('coordinator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sede')->nullable();
            $table->string('provider')->nullable();
            $table->string('plate_number', 20)->nullable();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->date('service_date')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->unique(['period_id', 'identity_key']);
            $table->index(['period_id', 'status']);
        });

        Schema::create('driver_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->foreignId('period_id')->constrained('periods')->cascadeOnDelete();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('unit_movement_id')->constrained('unit_movements')->cascadeOnDelete();
            $table->date('service_date');
            $table->string('correlative')->nullable();
            $table->string('plate_number', 20)->nullable();
            $table->string('provider')->nullable();
            $table->foreignId('coordinator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sede')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('driver_dni', 20)->nullable();
            $table->timestamps();

            $table->unique('unit_movement_id');
            $table->index(['driver_id', 'service_date']);
        });

        Schema::create('driver_status_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('driver_id')->constrained('drivers')->cascadeOnDelete();
            $table->string('status', 20);
            $table->date('happened_on');
            $table->string('source', 20)->default('manual');
            $table->timestamps();

            $table->index(['driver_id', 'happened_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_status_events');
        Schema::dropIfExists('driver_movements');
        Schema::dropIfExists('drivers');
    }
};
