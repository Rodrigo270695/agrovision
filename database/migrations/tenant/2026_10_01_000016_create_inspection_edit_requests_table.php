<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inspection_edit_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_checklist_id')->constrained('unit_checklists')->cascadeOnDelete();
            $table->string('inspection_pass', 10);
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('consumed_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'unit_checklist_id']);
            $table->index(['requested_by', 'inspection_pass']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspection_edit_requests');
    }
};
