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
        Schema::create('service_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        Schema::create('responsible_persons', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->unsignedInteger('sort')->default(0);
            $table->timestamps();
        });

        DB::table('units')
            ->whereNotNull('service_type')
            ->where('service_type', '!=', '')
            ->distinct()
            ->orderBy('service_type')
            ->pluck('service_type')
            ->each(function (string $name): void {
                UnitCatalog::rememberServiceType($name);
            });

        DB::table('units')
            ->whereNotNull('plate_number')
            ->where('plate_number', '!=', '')
            ->orderBy('id')
            ->get(['id', 'plate_number'])
            ->each(function (object $unit): void {
                $formatted = UnitCatalog::formatPlate($unit->plate_number);

                if (
                    is_string($formatted)
                    && preg_match('/^[A-Z0-9]{3}-[A-Z0-9]{3}$/', $formatted) === 1
                    && $formatted !== $unit->plate_number
                ) {
                    DB::table('units')->where('id', $unit->id)->update([
                        'plate_number' => $formatted,
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('responsible_persons');
        Schema::dropIfExists('service_types');
    }
};
