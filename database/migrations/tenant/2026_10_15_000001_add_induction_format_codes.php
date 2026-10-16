<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('tenant_settings', 'register_code')) {
                $table->string('register_code', 50)->nullable();
            }
            if (! Schema::hasColumn('tenant_settings', 'register_revision')) {
                $table->string('register_revision', 20)->nullable();
            }
            if (! Schema::hasColumn('tenant_settings', 'register_date')) {
                $table->date('register_date')->nullable();
            }
            if (! Schema::hasColumn('tenant_settings', 'risst_code')) {
                $table->string('risst_code', 50)->nullable();
            }
            if (! Schema::hasColumn('tenant_settings', 'risst_revision')) {
                $table->string('risst_revision', 20)->nullable();
            }
            if (! Schema::hasColumn('tenant_settings', 'ritran_code')) {
                $table->string('ritran_code', 50)->nullable();
            }
            if (! Schema::hasColumn('tenant_settings', 'ritran_revision')) {
                $table->string('ritran_revision', 20)->nullable();
            }
        });

        Schema::table('inductions', function (Blueprint $table) {
            if (! Schema::hasColumn('inductions', 'ritran_code')) {
                $table->string('ritran_code', 50)->nullable();
            }
            if (! Schema::hasColumn('inductions', 'ritran_revision')) {
                $table->string('ritran_revision', 20)->nullable();
            }
        });

        DB::table('tenant_settings')->whereNull('register_code')->update([
            'register_code' => 'GH-GD-FO-0609',
            'register_revision' => '006',
            'risst_code' => 'PE-M-SST-002',
            'risst_revision' => '2',
            'ritran_code' => 'PE-M-SST-004',
            'ritran_revision' => '1',
        ]);
    }

    public function down(): void
    {
        Schema::table('tenant_settings', function (Blueprint $table) {
            $table->dropColumn([
                'register_code',
                'register_revision',
                'register_date',
                'risst_code',
                'risst_revision',
                'ritran_code',
                'ritran_revision',
            ]);
        });

        Schema::table('inductions', function (Blueprint $table) {
            $table->dropColumn(['ritran_code', 'ritran_revision']);
        });
    }
};
