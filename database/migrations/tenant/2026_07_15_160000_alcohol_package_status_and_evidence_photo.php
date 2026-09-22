<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('alcohol_test_packages', function (Blueprint $table) {
            $table->string('status')->default('open')->after('notes');
            $table->timestamp('sent_to_coordinators_at')->nullable()->after('status');
            $table->timestamp('closed_at')->nullable()->after('sent_to_coordinators_at');
            $table->foreignId('closed_by')->nullable()->after('closed_at')->constrained('users')->nullOnDelete();
        });

        Schema::table('alcohol_tests', function (Blueprint $table) {
            $table->string('evidence_photo_path')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('alcohol_tests', function (Blueprint $table) {
            $table->dropColumn('evidence_photo_path');
        });

        Schema::table('alcohol_test_packages', function (Blueprint $table) {
            $table->dropConstrainedForeignId('closed_by');
            $table->dropColumn(['status', 'sent_to_coordinators_at', 'closed_at']);
        });
    }
};
