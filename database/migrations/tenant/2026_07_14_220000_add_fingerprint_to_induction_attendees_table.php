<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('induction_attendees', function (Blueprint $table) {
            if (! Schema::hasColumn('induction_attendees', 'fingerprint_path')) {
                $table->string('fingerprint_path')->nullable()->after('signed_at');
            }
            if (! Schema::hasColumn('induction_attendees', 'fingerprint_at')) {
                $table->timestamp('fingerprint_at')->nullable()->after('fingerprint_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('induction_attendees', function (Blueprint $table) {
            foreach (['fingerprint_at', 'fingerprint_path'] as $column) {
                if (Schema::hasColumn('induction_attendees', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
