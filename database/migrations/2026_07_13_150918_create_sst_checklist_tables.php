<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'pgsql') {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pgcrypto');
        }

        Schema::create('transport_companies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('legal_name');
            $table->string('trade_name')->nullable();
            $table->string('ruc', 20)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('drivers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('full_name');
            $table->string('document_type', 20)->default('DNI');
            $table->string('document_number', 30)->nullable();
            $table->string('license_number', 50);
            $table->string('license_class', 50)->nullable();
            $table->date('license_revalidation_date')->nullable();
            $table->string('phone', 30)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('vehicles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('plate', 20);
            $table->string('brand', 100)->nullable();
            $table->string('model', 100)->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            $table->string('unit_type', 10);
            $table->string('ownership_type', 20)->nullable();
            $table->unsignedSmallInteger('seat_capacity')->nullable();
            $table->foreignUuid('transport_company_id')->nullable()->constrained('transport_companies')->nullOnDelete();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('checklist_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('code', 40);
            $table->string('short_code', 10);
            $table->string('name');
            $table->string('unit_type', 10);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('code');
            $table->unique('short_code');
        });

        Schema::create('checklist_template_versions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('checklist_template_id')->constrained('checklist_templates')->cascadeOnDelete();
            $table->unsignedInteger('version_number');
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->string('document_title', 500)->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamps();

            $table->unique(['checklist_template_id', 'version_number'], 'uq_checklist_version');
        });

        Schema::create('checklist_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('checklist_template_version_id')->constrained('checklist_template_versions')->cascadeOnDelete();
            $table->uuid('parent_item_id')->nullable();
            $table->string('item_code', 30);
            $table->string('item_number', 10)->nullable();
            $table->unsignedInteger('sort_order');
            $table->text('label');
            $table->boolean('is_group')->default(false);
            $table->boolean('is_required')->default(true);
            $table->boolean('requires_expiry')->default(false);
            $table->text('help_text')->nullable();
            $table->timestamps();

            $table->unique(['checklist_template_version_id', 'item_code'], 'uq_checklist_item_code');
            $table->unique(['checklist_template_version_id', 'sort_order'], 'uq_checklist_item_sort');
        });

        Schema::table('checklist_items', function (Blueprint $table) {
            $table->foreign('parent_item_id')
                ->references('id')
                ->on('checklist_items')
                ->nullOnDelete();
        });

        Schema::create('checklist_signature_slots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('checklist_template_version_id')->constrained('checklist_template_versions')->cascadeOnDelete();
            $table->string('role', 50);
            $table->string('label', 120);
            $table->unsignedInteger('sort_order');
            $table->boolean('is_required')->default(true);
            $table->timestamps();

            $table->unique(['checklist_template_version_id', 'role'], 'uq_checklist_signature_role');
        });

        Schema::create('inspections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('checklist_template_version_id')->constrained('checklist_template_versions');
            $table->foreignUuid('vehicle_id')->constrained('vehicles');
            $table->foreignUuid('driver_id')->nullable()->constrained('drivers')->nullOnDelete();
            $table->foreignUuid('transport_company_id')->nullable()->constrained('transport_companies')->nullOnDelete();
            $table->string('location')->nullable();
            $table->text('additional_observations')->nullable();
            $table->string('vehicle_plate_snapshot', 20);
            $table->string('vehicle_brand_model_year_snapshot')->nullable();
            $table->string('driver_name_snapshot')->nullable();
            $table->string('driver_license_snapshot', 50)->nullable();
            $table->string('driver_license_class_snapshot', 50)->nullable();
            $table->date('driver_license_revalidation_snapshot')->nullable();
            $table->string('company_name_snapshot')->nullable();
            $table->string('status', 30)->default('borrador');
            $table->boolean('is_locked')->default(false);
            $table->char('integrity_hash', 64)->nullable();
            $table->timestampTz('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('inspected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('vehicle_id');
            $table->index('status');
            $table->index('vehicle_plate_snapshot');
        });

        Schema::create('inspection_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('inspection_id')->constrained('inspections')->cascadeOnDelete();
            $table->unsignedTinyInteger('attempt_number');
            $table->timestampTz('inspected_at');
            $table->string('result', 20)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['inspection_id', 'attempt_number'], 'uq_inspection_attempt');
        });

        Schema::create('inspection_answers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('inspection_attempt_id')->constrained('inspection_attempts')->cascadeOnDelete();
            $table->foreignUuid('checklist_item_id')->constrained('checklist_items');
            $table->string('complies', 10)->nullable();
            $table->text('observation')->nullable();
            $table->date('expiry_date')->nullable();
            $table->timestamps();

            $table->unique(['inspection_attempt_id', 'checklist_item_id'], 'uq_inspection_answer');
        });

        Schema::create('inspection_signatures', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('inspection_id')->constrained('inspections')->cascadeOnDelete();
            $table->string('role', 50);
            $table->string('signer_name');
            $table->foreignId('signer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('signed_at')->useCurrent();
            $table->string('signature_path', 500)->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->unique(['inspection_id', 'role'], 'uq_inspection_signature');
        });

        Schema::create('inspection_evidences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('inspection_id')->constrained('inspections')->cascadeOnDelete();
            $table->foreignUuid('checklist_item_id')->nullable()->constrained('checklist_items')->nullOnDelete();
            $table->string('file_path', 500);
            $table->string('file_mime', 100)->nullable();
            $table->unsignedBigInteger('file_size_bytes')->nullable();
            $table->char('checksum_sha256', 64)->nullable();
            $table->string('caption')->nullable();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('table_name', 100);
            $table->uuid('record_id');
            $table->string('action', 20);
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('old_data')->nullable();
            $table->json('new_data')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['table_name', 'record_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('inspection_evidences');
        Schema::dropIfExists('inspection_signatures');
        Schema::dropIfExists('inspection_answers');
        Schema::dropIfExists('inspection_attempts');
        Schema::dropIfExists('inspections');
        Schema::dropIfExists('checklist_signature_slots');
        Schema::dropIfExists('checklist_items');
        Schema::dropIfExists('checklist_template_versions');
        Schema::dropIfExists('checklist_templates');
        Schema::dropIfExists('vehicles');
        Schema::dropIfExists('drivers');
        Schema::dropIfExists('transport_companies');
    }
};
