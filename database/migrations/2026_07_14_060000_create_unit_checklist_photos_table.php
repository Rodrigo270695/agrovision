<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unit_checklist_photos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_checklist_id')->constrained('unit_checklists')->cascadeOnDelete();
            $table->string('inspection_pass', 10); // first | second
            $table->string('path');
            $table->string('disk', 30)->default('public');
            $table->string('mime_type', 100)->nullable();
            $table->unsignedInteger('size')->nullable();
            $table->timestamp('captured_at')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->decimal('accuracy', 8, 2)->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['unit_checklist_id', 'inspection_pass']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_checklist_photos');
    }
};
