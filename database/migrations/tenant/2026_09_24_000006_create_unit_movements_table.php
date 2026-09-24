<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unit_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('period_id')->constrained('periods')->cascadeOnDelete();
            $table->string('correlative')->unique();
            $table->date('service_date');
            $table->string('plate_number', 20);
            $table->string('phone', 20)->nullable();
            $table->string('provider')->nullable();
            $table->string('route')->nullable();
            $table->string('vehicle_type')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('responsible_person')->nullable();
            $table->string('service_type')->nullable();
            $table->string('ruc', 20)->nullable();
            $table->string('driver_dni', 20)->nullable();
            $table->string('category', 100)->nullable();
            $table->foreignId('coordinator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['unit_id', 'service_date']);
            $table->index('plate_number');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_movements');
    }
};
