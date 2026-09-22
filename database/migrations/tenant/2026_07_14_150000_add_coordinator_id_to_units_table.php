<?php

use App\Models\User;
use App\Support\SystemRoles;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Spatie\Permission\Models\Role;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('units', function (Blueprint $table) {
            if (! Schema::hasColumn('units', 'coordinator_id')) {
                $table->foreignId('coordinator_id')
                    ->nullable()
                    ->after('category')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });

        // Migra texto libre "coordinator" → user por nombre (si coincide).
        if (Schema::hasColumn('units', 'coordinator')) {
            // En entornos nuevos el rol puede no existir aún; no debe romper migrate.
            Role::findOrCreate(SystemRoles::COORDINADOR, 'web');

            $coordinators = User::role(SystemRoles::COORDINADOR)
                ->get(['id', 'name']);

            foreach ($coordinators as $user) {
                DB::table('units')
                    ->whereNull('coordinator_id')
                    ->whereRaw('LOWER(TRIM(coordinator)) = ?', [mb_strtolower(trim($user->name))])
                    ->update(['coordinator_id' => $user->id]);
            }

            Schema::table('units', function (Blueprint $table) {
                $table->dropColumn('coordinator');
            });
        }
    }

    public function down(): void
    {
        Schema::table('units', function (Blueprint $table) {
            if (! Schema::hasColumn('units', 'coordinator')) {
                $table->string('coordinator')->nullable()->after('category');
            }
        });

        if (Schema::hasColumn('units', 'coordinator_id')) {
            $rows = DB::table('units')
                ->whereNotNull('coordinator_id')
                ->get(['id', 'coordinator_id']);

            foreach ($rows as $row) {
                $name = DB::table('users')->where('id', $row->coordinator_id)->value('name');
                DB::table('units')->where('id', $row->id)->update([
                    'coordinator' => $name,
                ]);
            }

            Schema::table('units', function (Blueprint $table) {
                $table->dropConstrainedForeignId('coordinator_id');
            });
        }
    }
};
