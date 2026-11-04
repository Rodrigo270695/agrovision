<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('driver_blacklist_entries', function (Blueprint $table) {
            $table->id();
            $table->string('identity_key')->nullable()->index();
            $table->string('driver_dni')->nullable()->index();
            $table->string('driver_name');
            $table->string('plate_number')->nullable();
            $table->string('reason_code', 40);
            $table->text('reason_detail')->nullable();
            $table->string('photo_path');
            $table->string('source', 30)->default('manual');
            $table->foreignId('unit_id')->nullable()->constrained('units')->nullOnDelete();
            $table->foreignId('unit_checklist_id')->nullable()->constrained('unit_checklists')->nullOnDelete();
            $table->foreignId('alcohol_test_id')->nullable()->constrained('alcohol_tests')->nullOnDelete();
            $table->foreignId('induction_attendee_id')->nullable()->constrained('induction_attendees')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('lifted_at')->nullable();
            $table->foreignId('lifted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('lift_note')->nullable();
            $table->timestamps();

            $table->index(['lifted_at', 'created_at']);
            $table->index(['reason_code', 'lifted_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('driver_blacklist_entries');
    }
};
