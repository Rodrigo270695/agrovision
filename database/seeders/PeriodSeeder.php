<?php

namespace Database\Seeders;

use App\Models\Period;
use Illuminate\Database\Seeder;

class PeriodSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Period::query()->updateOrCreate(
            ['name' => 'Periodo Julio 2026'],
            [
                'date' => '2026-07-01',
                'status' => 'active',
            ],
        );

        Period::query()->updateOrCreate(
            ['name' => 'Periodo Junio 2026'],
            [
                'date' => '2026-06-01',
                'status' => 'inactive',
            ],
        );
    }
}
