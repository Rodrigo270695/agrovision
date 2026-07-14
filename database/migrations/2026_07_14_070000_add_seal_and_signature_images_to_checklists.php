<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_checklists', function (Blueprint $table) {
            if (! Schema::hasColumn('unit_checklists', 'sealed_at')) {
                $table->timestamp('sealed_at')->nullable()->after('status');
            }
        });

        Schema::table('unit_checklist_signatures', function (Blueprint $table) {
            if (! Schema::hasColumn('unit_checklist_signatures', 'signature_path')) {
                $table->string('signature_path')->nullable()->after('signer_name');
            }

            if (! Schema::hasColumn('unit_checklist_signatures', 'signed_at')) {
                $table->timestamp('signed_at')->nullable()->after('signature_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('unit_checklists', function (Blueprint $table) {
            if (Schema::hasColumn('unit_checklists', 'sealed_at')) {
                $table->dropColumn('sealed_at');
            }
        });

        Schema::table('unit_checklist_signatures', function (Blueprint $table) {
            if (Schema::hasColumn('unit_checklist_signatures', 'signed_at')) {
                $table->dropColumn('signed_at');
            }

            if (Schema::hasColumn('unit_checklist_signatures', 'signature_path')) {
                $table->dropColumn('signature_path');
            }
        });
    }
};
