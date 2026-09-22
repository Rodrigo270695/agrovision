<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class CentralUserSeeder extends Seeder
{
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'soporte@gindelsi.pe'],
            [
                'name' => 'Soporte Gindelsi',
                'password' => 'password',
                'email_verified_at' => now(),
            ],
        );
    }
}
