<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inductions', function (Blueprint $table) {
            if (! Schema::hasColumn('inductions', 'speaker_signature_path')) {
                $table->string('speaker_signature_path')->nullable()->after('speaker_institution');
            }

            if (! Schema::hasColumn('inductions', 'speaker_signed_at')) {
                $table->timestamp('speaker_signed_at')->nullable()->after('speaker_signature_path');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inductions', function (Blueprint $table) {
            if (Schema::hasColumn('inductions', 'speaker_signed_at')) {
                $table->dropColumn('speaker_signed_at');
            }

            if (Schema::hasColumn('inductions', 'speaker_signature_path')) {
                $table->dropColumn('speaker_signature_path');
            }
        });
    }
};
