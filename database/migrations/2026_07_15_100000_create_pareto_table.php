<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pareto', function (Blueprint $table) {
            $table->id();
            $table->string('template_type', 10); // tdp | tdc
            $table->foreignId('parent_id')->nullable()->constrained('pareto')->nullOnDelete();
            $table->string('item_number', 20);
            $table->string('label');
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('check_type', 30)->default('observation'); // observation | expiry
            $table->decimal('weight', 6, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['template_type', 'sort_order']);
            $table->index(['template_type', 'parent_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pareto');
    }
};
