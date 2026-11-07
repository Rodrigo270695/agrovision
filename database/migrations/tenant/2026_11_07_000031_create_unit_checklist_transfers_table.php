<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unit_checklist_transfers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_checklist_id')
                ->constrained('unit_checklists')
                ->cascadeOnDelete();
            $table->foreignId('from_user_id')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->foreignId('to_user_id')
                ->constrained('users')
                ->restrictOnDelete();
            $table->foreignId('transferred_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->text('note')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();

            $table->index(['unit_checklist_id', 'created_at']);
            $table->index(['to_user_id', 'created_at']);
            $table->index(['from_user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_checklist_transfers');
    }
};
