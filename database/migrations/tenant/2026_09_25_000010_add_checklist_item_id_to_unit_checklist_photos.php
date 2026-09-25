<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('unit_checklist_photos', function (Blueprint $table) {
            $table->foreignId('checklist_item_id')
                ->nullable()
                ->after('inspection_pass')
                ->constrained('checklist_items')
                ->nullOnDelete();

            $table->index(
                ['unit_checklist_id', 'checklist_item_id', 'inspection_pass'],
                'unit_checklist_photos_item_pass_index',
            );
        });
    }

    public function down(): void
    {
        Schema::table('unit_checklist_photos', function (Blueprint $table) {
            $table->dropIndex('unit_checklist_photos_item_pass_index');
            $table->dropConstrainedForeignId('checklist_item_id');
        });
    }
};
