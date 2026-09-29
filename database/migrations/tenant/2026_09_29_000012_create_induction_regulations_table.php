<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('induction_regulations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('induction_id')->constrained('inductions')->cascadeOnDelete();
            $table->string('original_name');
            $table->string('path');
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('induction_regulations');
    }
};
