<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checklist_items', function (Blueprint $table) {
            $table->foreignId('pareto_id')
                ->nullable()
                ->after('template_id')
                ->constrained('pareto')
                ->nullOnDelete();
            $table->string('check_type', 30)->nullable()->after('has_expiry');
            $table->decimal('weight', 6, 2)->nullable()->after('check_type');

            $table->unique('pareto_id');
        });
    }

    public function down(): void
    {
        Schema::table('checklist_items', function (Blueprint $table) {
            $table->dropUnique(['pareto_id']);
            $table->dropConstrainedForeignId('pareto_id');
            $table->dropColumn(['check_type', 'weight']);
        });
    }
};
