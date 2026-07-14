<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inductions', function (Blueprint $table) {
            $table->string('acta_number', 20)->nullable()->after('id');
            $table->text('temario')->nullable()->after('title');
            $table->string('activity', 40)->nullable()->after('temario');
            $table->boolean('corrective_action')->default(false)->after('activity');
            $table->string('modality', 20)->nullable()->after('corrective_action');
            $table->string('school', 40)->nullable()->after('modality');
            $table->json('categories')->nullable()->after('school');
            $table->string('category_other')->nullable()->after('categories');
            $table->date('session_date')->nullable()->after('category_other');
            $table->time('start_time')->nullable()->after('session_date');
            $table->time('end_time')->nullable()->after('start_time');
            $table->unsignedInteger('estimated_minutes')->nullable()->after('end_time');
            $table->string('sede')->nullable()->after('estimated_minutes');
            $table->string('department')->nullable()->after('sede');
            $table->string('area')->nullable()->after('department');
            $table->string('section')->nullable()->after('area');
            $table->string('zone')->nullable()->after('section');
            $table->string('target_group')->nullable()->after('zone');
            $table->string('crop')->nullable()->after('target_group');
            $table->string('org_unit')->nullable()->after('crop');
            $table->string('speaker_name')->nullable()->after('org_unit');
            $table->string('speaker_institution')->nullable()->after('speaker_name');
        });

        // Migra datos existentes al formato extendido.
        $rows = DB::table('inductions')->get(['id', 'title', 'scheduled_at', 'location', 'notes']);

        foreach ($rows as $row) {
            $scheduled = $row->scheduled_at ? \Carbon\Carbon::parse($row->scheduled_at) : null;

            DB::table('inductions')->where('id', $row->id)->update([
                'acta_number' => str_pad((string) $row->id, 6, '0', STR_PAD_LEFT),
                'temario' => $row->notes,
                'activity' => 'induccion',
                'modality' => 'interna',
                'school' => 'sig',
                'categories' => json_encode(['seguridad_salud_trabajo']),
                'session_date' => $scheduled?->toDateString(),
                'start_time' => $scheduled?->format('H:i:s'),
                'end_time' => $scheduled?->copy()->addHour()->format('H:i:s'),
                'estimated_minutes' => 60,
                'sede' => $row->location,
            ]);
        }

        Schema::table('induction_attendees', function (Blueprint $table) {
            $table->string('area_cargo')->nullable()->after('driver_name');
            $table->string('signature_path')->nullable()->after('notes');
            $table->timestamp('signed_at')->nullable()->after('signature_path');
        });
    }

    public function down(): void
    {
        Schema::table('induction_attendees', function (Blueprint $table) {
            $table->dropColumn(['area_cargo', 'signature_path', 'signed_at']);
        });

        Schema::table('inductions', function (Blueprint $table) {
            $table->dropColumn([
                'acta_number',
                'temario',
                'activity',
                'corrective_action',
                'modality',
                'school',
                'categories',
                'category_other',
                'session_date',
                'start_time',
                'end_time',
                'estimated_minutes',
                'sede',
                'department',
                'area',
                'section',
                'zone',
                'target_group',
                'crop',
                'org_unit',
                'speaker_name',
                'speaker_institution',
            ]);
        });
    }
};
