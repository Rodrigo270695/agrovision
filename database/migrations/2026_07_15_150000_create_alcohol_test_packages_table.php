<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('alcohol_test_packages', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->date('session_date');
            $table->text('notes')->nullable();
            $table->foreignId('period_id')->nullable()->constrained('periods')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['session_date']);
        });

        Schema::table('alcohol_tests', function (Blueprint $table) {
            $table->foreignId('package_id')
                ->nullable()
                ->after('id')
                ->constrained('alcohol_test_packages')
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('alcohol_tests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('package_id');
        });

        Schema::dropIfExists('alcohol_test_packages');
    }
};
