<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inductions', function (Blueprint $table) {
            if (! Schema::hasColumn('inductions', 'document_code')) {
                $table->string('document_code', 50)->nullable()->after('acta_number');
            }
            if (! Schema::hasColumn('inductions', 'document_revision')) {
                $table->string('document_revision', 20)->nullable()->after('document_code');
            }
            if (! Schema::hasColumn('inductions', 'document_date')) {
                $table->date('document_date')->nullable()->after('document_revision');
            }
            if (! Schema::hasColumn('inductions', 'risst_code')) {
                $table->string('risst_code', 50)->nullable()->after('document_date');
            }
            if (! Schema::hasColumn('inductions', 'risst_revision')) {
                $table->string('risst_revision', 20)->nullable()->after('risst_code');
            }
            if (! Schema::hasColumn('inductions', 'risst_date')) {
                $table->date('risst_date')->nullable()->after('risst_revision');
            }
            if (! Schema::hasColumn('inductions', 'risst_approval_date')) {
                $table->date('risst_approval_date')->nullable()->after('risst_date');
            }
            if (! Schema::hasColumn('inductions', 'risst_version')) {
                $table->string('risst_version', 20)->nullable()->after('risst_approval_date');
            }
        });
    }

    public function down(): void
    {
        Schema::table('inductions', function (Blueprint $table) {
            foreach ([
                'document_code',
                'document_revision',
                'document_date',
                'risst_code',
                'risst_revision',
                'risst_date',
                'risst_approval_date',
                'risst_version',
            ] as $column) {
                if (Schema::hasColumn('inductions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
