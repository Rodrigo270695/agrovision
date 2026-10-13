<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('driver_biometrics')) {
            return;
        }

        Schema::create('driver_biometrics', function (Blueprint $table) {
            $table->id();
            $table->string('dni', 20)->nullable();
            $table->string('name_key', 160)->nullable();
            $table->string('driver_name')->nullable();
            $table->string('signature_path')->nullable();
            $table->string('fingerprint_path')->nullable();
            $table->timestamps();

            $table->unique('dni');
            $table->index('name_key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_biometrics');
    }
};
