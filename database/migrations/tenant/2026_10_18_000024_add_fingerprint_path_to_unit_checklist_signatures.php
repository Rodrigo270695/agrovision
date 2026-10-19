<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_checklist_signatures', function (Blueprint $table) {
            if (! Schema::hasColumn('unit_checklist_signatures', 'fingerprint_path')) {
                $table->string('fingerprint_path')->nullable()->after('signature_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('unit_checklist_signatures', function (Blueprint $table) {
            if (Schema::hasColumn('unit_checklist_signatures', 'fingerprint_path')) {
                $table->dropColumn('fingerprint_path');
            }
        });
    }
};
