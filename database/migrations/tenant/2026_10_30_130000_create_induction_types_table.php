<?php

use App\Support\InductionTypeCatalog;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('induction_types', function (Blueprint $table): void {
            $table->id();
            $table->string('slug', 64)->unique();
            $table->string('title');
            $table->string('activity', 64);
            $table->string('short', 80)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $now = now();
        $rows = [];

        foreach (array_values(InductionTypeCatalog::defaults()) as $index => $type) {
            $rows[] = [
                'slug' => $type['slug'],
                'title' => $type['title'],
                'activity' => $type['activity'],
                'short' => $type['short'],
                'sort_order' => $index + 1,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::table('induction_types')->insert($rows);
    }

    public function down(): void
    {
        Schema::dropIfExists('induction_types');
    }
};
