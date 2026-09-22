<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('unit_documents')) {
            return;
        }

        DB::table('unit_documents')
            ->where('type', 'circulation_permit')
            ->update(['type' => 'sctr']);
    }

    public function down(): void
    {
        if (! Schema::hasTable('unit_documents')) {
            return;
        }

        DB::table('unit_documents')
            ->where('type', 'sctr')
            ->update(['type' => 'circulation_permit']);
    }
};
