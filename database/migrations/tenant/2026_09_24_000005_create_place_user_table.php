<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('place_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('place_id')->constrained()->cascadeOnDelete();
            $table->unique(['user_id', 'place_id']);
            $table->timestamps();
        });

        $now = now();

        DB::table('users')
            ->whereNotNull('place_id')
            ->orderBy('id')
            ->get(['id', 'place_id'])
            ->each(function (object $user) use ($now): void {
                DB::table('place_user')->insert([
                    'user_id' => $user->id,
                    'place_id' => $user->place_id,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('place_user');
    }
};
