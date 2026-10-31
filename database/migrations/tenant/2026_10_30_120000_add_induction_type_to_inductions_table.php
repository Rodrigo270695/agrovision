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
        Schema::table('inductions', function (Blueprint $table): void {
            $table->string('induction_type', 64)->nullable()->after('title');
            $table->index('induction_type');
        });

        DB::table('inductions')
            ->orderBy('id')
            ->select(['id', 'title', 'activity'])
            ->chunkById(100, function ($rows): void {
                foreach ($rows as $row) {
                    $slug = InductionTypeCatalog::resolveFromTitle((string) $row->title);

                    if ($slug === null && (string) $row->activity === 'induccion') {
                        $slug = InductionTypeCatalog::SST;
                    }

                    if ($slug === null) {
                        continue;
                    }

                    $type = InductionTypeCatalog::get($slug);

                    DB::table('inductions')->where('id', $row->id)->update([
                        'induction_type' => $slug,
                        'title' => $type['title'],
                        'activity' => $type['activity'],
                    ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('inductions', function (Blueprint $table): void {
            $table->dropIndex(['induction_type']);
            $table->dropColumn('induction_type');
        });
    }
};
