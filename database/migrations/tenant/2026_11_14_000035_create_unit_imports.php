<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('unit_imports')) {
            if (Schema::hasTable('unit_movements') && ! Schema::hasColumn('unit_movements', 'import_id')) {
                Schema::table('unit_movements', function (Blueprint $table) {
                    $table->foreignId('import_id')->nullable()->constrained('unit_imports')->nullOnDelete();
                });
            }

            return;
        }

        Schema::create('unit_imports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('period_id')->constrained('periods')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('imported_on');
            $table->string('scope_key', 40);
            $table->timestamps();

            $table->unique(['period_id', 'imported_on', 'scope_key']);
        });

        Schema::create('unit_import_rollbacks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_id')->constrained('unit_imports')->cascadeOnDelete();
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->boolean('created_unit')->default(false);
            $table->string('previous_status', 20)->nullable();
            $table->string('previous_provider')->nullable();
            $table->string('previous_driver_name')->nullable();
            $table->string('previous_driver_dni', 20)->nullable();
            $table->foreignId('previous_coordinator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('previous_responsible_person')->nullable();
            $table->json('status_event_ids')->nullable();
            $table->timestamps();
        });

        Schema::table('unit_movements', function (Blueprint $table) {
            $table->foreignId('import_id')->nullable()->after('period_id')->constrained('unit_imports')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('unit_movements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('import_id');
        });

        Schema::dropIfExists('unit_import_rollbacks');
        Schema::dropIfExists('unit_imports');
    }
};
