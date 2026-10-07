<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('central_certificate_templates', function (Blueprint $table) {
            $table->date('starts_on')->nullable()->after('course_title');
        });
    }

    public function down(): void
    {
        Schema::table('central_certificate_templates', function (Blueprint $table) {
            $table->dropColumn('starts_on');
        });
    }
};
