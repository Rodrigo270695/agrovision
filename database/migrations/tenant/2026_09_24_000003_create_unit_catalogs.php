<?php

use App\Support\UnitCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('license_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        DB::statement('ALTER TABLE units ALTER COLUMN category TYPE varchar(100)');

        UnitCatalog::seedDefaults();

        DB::table('units')
            ->whereNotNull('vehicle_type')
            ->where('vehicle_type', '!=', '')
            ->distinct()
            ->orderBy('vehicle_type')
            ->pluck('vehicle_type')
            ->each(function (string $name): void {
                UnitCatalog::rememberVehicleType($name);
            });

        DB::table('units')
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->each(function (string $name): void {
                UnitCatalog::rememberLicenseCategory($name);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('license_categories');
        Schema::dropIfExists('vehicle_types');
    }
};
