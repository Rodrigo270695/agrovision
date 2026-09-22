<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')
                ->constrained('periods')
                ->cascadeOnDelete();
            $table->string('correlative')->unique();
            $table->string('phone', 20)->nullable();
            $table->string('provider');
            $table->string('route')->nullable();
            $table->string('vehicle_type')->nullable();
            $table->date('service_date')->nullable();
            $table->string('driver_name')->nullable();
            $table->string('plate_number', 20)->nullable();
            $table->string('responsible_person')->nullable();
            $table->string('service_type')->nullable();
            $table->string('ruc', 20)->nullable();
            $table->string('driver_dni', 20)->nullable();
            $table->string('category', 20)->nullable();
            $table->string('coordinator')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
