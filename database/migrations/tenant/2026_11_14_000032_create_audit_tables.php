<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('user_name')->nullable();
            $table->string('action', 32)->index();
            $table->string('module', 80)->index();
            $table->string('record_type', 80)->nullable();
            $table->string('record_id', 64)->nullable();
            $table->string('record_code', 160)->nullable()->index();
            $table->json('changes')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('browser', 80)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('url', 255)->nullable();
            $table->timestamp('created_at')->nullable()->index();
        });

        Schema::create('user_presences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique();
            $table->string('user_name')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedInteger('accuracy')->nullable();
            $table->string('ip', 45)->nullable();
            $table->string('browser', 80)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('last_seen_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_presences');
        Schema::dropIfExists('activity_logs');
    }
};
