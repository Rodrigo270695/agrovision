<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspection_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('coordinator_id')->constrained('users')->cascadeOnDelete();
            $table->date('inspected_on');
            $table->string('status', 20)->default('sent');
            $table->foreignId('sent_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('sent_at')->nullable();
            $table->string('signer_name')->nullable();
            $table->string('signature_path')->nullable();
            $table->timestamp('signed_at')->nullable();
            $table->timestamps();

            $table->unique(['coordinator_id', 'inspected_on']);
            $table->index('status');
        });

        Schema::table('unit_checklists', function (Blueprint $table) {
            $table->foreignId('inspection_batch_id')
                ->nullable()
                ->after('sealed_at')
                ->constrained('inspection_batches')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('unit_checklists', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inspection_batch_id');
        });

        Schema::dropIfExists('inspection_batches');
    }
};
