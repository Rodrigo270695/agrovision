<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('checklist_templates', 'label')) {
            Schema::table('checklist_templates', function (Blueprint $table) {
                $table->string('label', 80)->nullable();
            });
        }

        DB::statement('ALTER TABLE checklist_templates ALTER COLUMN type TYPE varchar(50)');
        DB::statement('ALTER TABLE pareto ALTER COLUMN template_type TYPE varchar(50)');

        DB::table('checklist_templates')
            ->whereNull('label')
            ->update(['label' => DB::raw('upper(type)')]);
    }

    public function down(): void
    {
        if (Schema::hasColumn('checklist_templates', 'label')) {
            Schema::table('checklist_templates', function (Blueprint $table) {
                $table->dropColumn('label');
            });
        }
    }
};
