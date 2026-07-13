<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::query()->updateOrCreate(
            ['email' => 'admin@agrovision.com'],
            [
                'name' => 'Administrador',
                'password' => 'password',
                'email_verified_at' => now(),
            ],
        );
    }
}
