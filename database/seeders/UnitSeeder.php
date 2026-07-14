<?php

namespace Database\Seeders;

use App\Models\Period;
use App\Models\Unit;
use App\Models\User;
use App\Support\SystemRoles;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $period = Period::query()->where('status', 'active')->first()
            ?? Period::query()->firstOrCreate(
                ['name' => 'Periodo Julio 2026'],
                [
                    'date' => '2026-07-01',
                    'status' => 'active',
                ],
            );

        $coordinatorId = User::role(SystemRoles::COORDINADOR)->value('id');

        Unit::query()->updateOrCreate(
            ['correlative' => 'AGV2026-6955'],
            [
                'period_id' => $period->id,
                'phone' => '985555756',
                'email' => 'cajusol@agrovision.com',
                'provider' => 'AGROVISION PERU S.A.C.',
                'route' => 'CAMPAMENT',
                'vehicle_type' => 'MINIBUS',
                'service_date' => '2026-07-13',
                'driver_name' => 'CAJUSOL SANTAMARIA DAVID',
                'plate_number' => 'T5M-121',
                'responsible_person' => 'CORREA HUA',
                'service_type' => 'CAMPAMENT',
                'ruc' => '20554556192',
                'driver_dni' => '46909313',
                'category' => 'B',
                'coordinator_id' => $coordinatorId,
            ],
        );

        Unit::factory()->count(8)->create([
            'period_id' => $period->id,
            'coordinator_id' => $coordinatorId,
        ]);
    }
}
