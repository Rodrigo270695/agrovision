<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_checklist_signatures', function (Blueprint $table) {
            $table->dropUnique('unit_checklist_signatures_unique');
        });

        Schema::table('unit_checklist_signatures', function (Blueprint $table) {
            $table->string('inspection_pass', 10)->default('first')->after('signature_role_id');
            $table->string('slot', 20)->nullable()->after('inspection_pass');
        });

        Schema::table('unit_checklist_signatures', function (Blueprint $table) {
            $table->dropForeign(['signature_role_id']);
        });

        Schema::table('unit_checklist_signatures', function (Blueprint $table) {
            $table->unsignedBigInteger('signature_role_id')->nullable()->change();
            $table->foreign('signature_role_id')
                ->references('id')
                ->on('checklist_signature_roles')
                ->cascadeOnDelete();
            $table->unique(
                ['unit_checklist_id', 'inspection_pass', 'slot'],
                'unit_checklist_signatures_slot_unique',
            );
        });
    }

    public function down(): void
    {
        Schema::table('unit_checklist_signatures', function (Blueprint $table) {
            $table->dropUnique('unit_checklist_signatures_slot_unique');
            $table->dropColumn(['inspection_pass', 'slot']);
            $table->dropForeign(['signature_role_id']);
        });

        Schema::table('unit_checklist_signatures', function (Blueprint $table) {
            $table->unsignedBigInteger('signature_role_id')->nullable(false)->change();
            $table->foreign('signature_role_id')
                ->references('id')
                ->on('checklist_signature_roles')
                ->cascadeOnDelete();
            $table->unique(['unit_checklist_id', 'signature_role_id'], 'unit_checklist_signatures_unique');
        });
    }
};
