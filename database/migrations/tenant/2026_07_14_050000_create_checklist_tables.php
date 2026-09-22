<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checklist_templates', function (Blueprint $table) {
            $table->id();
            $table->string('type', 10); // tdp | tdc
            $table->string('code', 50);
            $table->string('name');
            $table->string('version', 20)->default('1');
            $table->text('notes_hint')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('type');
            $table->unique('code');
        });

        Schema::create('checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('checklist_templates')->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('checklist_items')->cascadeOnDelete();
            $table->string('item_number', 20)->nullable();
            $table->string('label');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('has_expiry')->default(false);
            $table->timestamps();

            $table->index(['template_id', 'sort_order']);
        });

        Schema::create('checklist_signature_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('checklist_templates')->cascadeOnDelete();
            $table->string('label');
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('unit_checklists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_id')->constrained('units')->cascadeOnDelete();
            $table->foreignId('period_id')->constrained('periods')->cascadeOnDelete();
            $table->foreignId('template_id')->constrained('checklist_templates')->restrictOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->string('plate_number', 20);
            $table->string('driver_name')->nullable();
            $table->string('provider')->nullable();

            $table->date('first_inspected_on')->nullable();
            $table->time('first_inspected_time')->nullable();
            $table->date('second_inspected_on')->nullable();
            $table->time('second_inspected_time')->nullable();

            $table->string('location')->nullable();
            $table->string('transport_company')->nullable();
            $table->string('vehicle_info')->nullable();
            $table->string('license_number', 50)->nullable();
            $table->string('license_class', 50)->nullable();
            $table->date('license_revalidation_on')->nullable();

            $table->string('first_result', 20)->nullable(); // approved | rejected
            $table->string('second_result', 20)->nullable();
            $table->text('additional_observations')->nullable();
            $table->string('status', 20)->default('draft'); // draft | completed

            $table->timestamps();

            $table->unique(['unit_id', 'template_id', 'period_id'], 'unit_checklists_unique');
            $table->index(['period_id', 'status']);
            $table->index('plate_number');
        });

        Schema::create('unit_checklist_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_checklist_id')->constrained('unit_checklists')->cascadeOnDelete();
            $table->foreignId('checklist_item_id')->constrained('checklist_items')->cascadeOnDelete();
            $table->string('first_value', 10)->nullable(); // yes | no
            $table->string('second_value', 10)->nullable();
            $table->text('observations')->nullable();
            $table->timestamps();

            $table->unique(['unit_checklist_id', 'checklist_item_id'], 'unit_checklist_answers_unique');
        });

        Schema::create('unit_checklist_signatures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('unit_checklist_id')->constrained('unit_checklists')->cascadeOnDelete();
            $table->foreignId('signature_role_id')->constrained('checklist_signature_roles')->cascadeOnDelete();
            $table->string('signer_name')->nullable();
            $table->timestamps();

            $table->unique(['unit_checklist_id', 'signature_role_id'], 'unit_checklist_signatures_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unit_checklist_signatures');
        Schema::dropIfExists('unit_checklist_answers');
        Schema::dropIfExists('unit_checklists');
        Schema::dropIfExists('checklist_signature_roles');
        Schema::dropIfExists('checklist_items');
        Schema::dropIfExists('checklist_templates');
    }
};
