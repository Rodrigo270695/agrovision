<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Corrige timestamps que se guardaron con APP_TIMEZONE=UTC
     * (5 horas adelante de América/Lima).
     */
    public function up(): void
    {
        if (Schema::hasTable('unit_checklist_photos') && Schema::hasColumn('unit_checklist_photos', 'captured_at')) {
            DB::statement("UPDATE unit_checklist_photos SET captured_at = captured_at - INTERVAL '5 hours' WHERE captured_at IS NOT NULL");
        }

        if (Schema::hasTable('unit_checklist_signatures') && Schema::hasColumn('unit_checklist_signatures', 'signed_at')) {
            DB::statement("UPDATE unit_checklist_signatures SET signed_at = signed_at - INTERVAL '5 hours' WHERE signed_at IS NOT NULL");
        }

        if (Schema::hasTable('unit_checklists') && Schema::hasColumn('unit_checklists', 'sealed_at')) {
            DB::statement("UPDATE unit_checklists SET sealed_at = sealed_at - INTERVAL '5 hours' WHERE sealed_at IS NOT NULL");
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('unit_checklist_photos') && Schema::hasColumn('unit_checklist_photos', 'captured_at')) {
            DB::statement("UPDATE unit_checklist_photos SET captured_at = captured_at + INTERVAL '5 hours' WHERE captured_at IS NOT NULL");
        }

        if (Schema::hasTable('unit_checklist_signatures') && Schema::hasColumn('unit_checklist_signatures', 'signed_at')) {
            DB::statement("UPDATE unit_checklist_signatures SET signed_at = signed_at + INTERVAL '5 hours' WHERE signed_at IS NOT NULL");
        }

        if (Schema::hasTable('unit_checklists') && Schema::hasColumn('unit_checklists', 'sealed_at')) {
            DB::statement("UPDATE unit_checklists SET sealed_at = sealed_at + INTERVAL '5 hours' WHERE sealed_at IS NOT NULL");
        }
    }
};
