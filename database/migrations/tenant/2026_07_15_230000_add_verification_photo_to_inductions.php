<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('inductions')) {
            return;
        }

        Schema::table('inductions', function (Blueprint $table) {
            if (! Schema::hasColumn('inductions', 'verification_photo_path')) {
                $table->string('verification_photo_path')->nullable()->after('speaker_signed_at');
            }
            if (! Schema::hasColumn('inductions', 'verification_photo_at')) {
                $table->timestamp('verification_photo_at')->nullable()->after('verification_photo_path');
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('inductions')) {
            return;
        }

        Schema::table('inductions', function (Blueprint $table) {
            if (Schema::hasColumn('inductions', 'verification_photo_at')) {
                $table->dropColumn('verification_photo_at');
            }
            if (Schema::hasColumn('inductions', 'verification_photo_path')) {
                $table->dropColumn('verification_photo_path');
            }
        });
    }
};
