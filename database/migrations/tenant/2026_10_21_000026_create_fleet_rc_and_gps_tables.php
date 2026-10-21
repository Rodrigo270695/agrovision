<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rc_insurances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('periods')->cascadeOnDelete();
            $table->string('plate_number', 20);
            $table->string('unit_class')->nullable();
            $table->string('vehicle_type')->nullable();
            $table->string('usage')->nullable();
            $table->string('condition_flag', 20)->nullable();
            $table->string('supervisor_tdp')->nullable();
            $table->string('procedure')->nullable();
            $table->date('activated_on')->nullable();
            $table->date('expires_on')->nullable();
            $table->date('service_date')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->unique(['period_id', 'plate_number']);
            $table->index(['period_id', 'status']);
        });

        Schema::create('rc_insurance_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rc_insurance_id')->constrained('rc_insurances')->cascadeOnDelete();
            $table->foreignId('period_id')->constrained('periods')->cascadeOnDelete();
            $table->date('service_date');
            $table->string('plate_number', 20);
            $table->string('unit_class')->nullable();
            $table->string('vehicle_type')->nullable();
            $table->string('usage')->nullable();
            $table->string('condition_flag', 20)->nullable();
            $table->string('supervisor_tdp')->nullable();
            $table->string('procedure')->nullable();
            $table->date('activated_on')->nullable();
            $table->date('expires_on')->nullable();
            $table->timestamps();

            $table->unique(['period_id', 'plate_number', 'service_date']);
            $table->index(['service_date', 'plate_number']);
        });

        Schema::create('rc_insurance_status_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rc_insurance_id')->constrained('rc_insurances')->cascadeOnDelete();
            $table->string('status', 20);
            $table->date('happened_on');
            $table->string('source', 20)->default('import');
            $table->timestamps();

            $table->index(['rc_insurance_id', 'happened_on']);
        });

        Schema::create('gps_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('periods')->cascadeOnDelete();
            $table->string('plate_number', 20);
            $table->string('imei', 32)->nullable();
            $table->date('installed_on')->nullable();
            $table->date('service_date')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->unique(['period_id', 'plate_number']);
            $table->index(['period_id', 'status']);
        });

        Schema::create('gps_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gps_record_id')->constrained('gps_records')->cascadeOnDelete();
            $table->foreignId('period_id')->constrained('periods')->cascadeOnDelete();
            $table->date('service_date');
            $table->string('plate_number', 20);
            $table->string('imei', 32)->nullable();
            $table->date('installed_on')->nullable();
            $table->timestamps();

            $table->unique(['period_id', 'plate_number', 'service_date']);
            $table->index(['service_date', 'plate_number']);
        });

        Schema::create('gps_status_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('gps_record_id')->constrained('gps_records')->cascadeOnDelete();
            $table->string('status', 20);
            $table->date('happened_on');
            $table->string('source', 20)->default('import');
            $table->timestamps();

            $table->index(['gps_record_id', 'happened_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gps_status_events');
        Schema::dropIfExists('gps_movements');
        Schema::dropIfExists('gps_records');
        Schema::dropIfExists('rc_insurance_status_events');
        Schema::dropIfExists('rc_insurance_movements');
        Schema::dropIfExists('rc_insurances');
    }
};
