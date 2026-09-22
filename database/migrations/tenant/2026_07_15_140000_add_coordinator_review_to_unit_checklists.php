<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_checklists', function (Blueprint $table) {
            $table->string('coordinator_status', 20)->nullable()->after('status'); // observed | reviewed
            $table->timestamp('sent_to_coordinator_at')->nullable()->after('coordinator_status');
            $table->text('coordinator_action_plan')->nullable()->after('sent_to_coordinator_at');
            $table->string('coordinator_signature_path')->nullable()->after('coordinator_action_plan');
            $table->string('coordinator_signer_name')->nullable()->after('coordinator_signature_path');
            $table->timestamp('coordinator_signed_at')->nullable()->after('coordinator_signer_name');
            $table->timestamp('coordinator_responded_at')->nullable()->after('coordinator_signed_at');

            $table->index('coordinator_status');
        });
    }

    public function down(): void
    {
        Schema::table('unit_checklists', function (Blueprint $table) {
            $table->dropIndex(['coordinator_status']);
            $table->dropColumn([
                'coordinator_status',
                'sent_to_coordinator_at',
                'coordinator_action_plan',
                'coordinator_signature_path',
                'coordinator_signer_name',
                'coordinator_signed_at',
                'coordinator_responded_at',
            ]);
        });
    }
};
