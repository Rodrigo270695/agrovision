<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pareto', function (Blueprint $table) {
            $table->boolean('allows_photo')->default(false)->after('is_active');
        });

        Schema::table('checklist_items', function (Blueprint $table) {
            $table->boolean('allows_photo')->default(false)->after('weight');
        });

        $numbers = ['13', '14', '19', '21', '26', '30'];

        DB::table('pareto')
            ->where('template_type', 'tdp')
            ->whereIn(DB::raw('trim(item_number)'), $numbers)
            ->update(['allows_photo' => true]);

        $tdpTemplateIds = DB::table('checklist_templates')
            ->where('type', 'tdp')
            ->pluck('id');

        if ($tdpTemplateIds->isNotEmpty()) {
            DB::table('checklist_items')
                ->whereIn('template_id', $tdpTemplateIds)
                ->whereIn(DB::raw('trim(item_number)'), $numbers)
                ->update(['allows_photo' => true]);
        }
    }

    public function down(): void
    {
        Schema::table('checklist_items', function (Blueprint $table) {
            $table->dropColumn('allows_photo');
        });

        Schema::table('pareto', function (Blueprint $table) {
            $table->dropColumn('allows_photo');
        });
    }
};
