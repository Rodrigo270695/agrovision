<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('unit_status_events')) {
            return;
        }

        Schema::create('unit_status_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->string('status', 20);
            $table->date('happened_on');
            $table->string('source', 20)->default('manual');
            $table->timestamps();

            $table->index(['unit_id', 'happened_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_status_events');
    }
};
