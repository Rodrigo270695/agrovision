<?php

namespace Database\Factories;

use App\Models\Period;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Unit>
 */
class UnitFactory extends Factory
{
    protected $model = Unit::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $year = now()->year;

        return [
            'period_id' => Period::query()->inRandomOrder()->value('id')
                ?? Period::factory(),
            'correlative' => sprintf('AGV%d-%d', $year, fake()->unique()->numberBetween(1000, 9999)),
            'phone' => (string) fake()->numerify('9########'),
            'email' => fake()->unique()->safeEmail(),
            'provider' => 'AGROVISION PERU S.A.C.',
            'route' => fake()->randomElement(['CAMPAMENT', 'FUNDO', 'PLANTA', 'PUERTO']),
            'vehicle_type' => fake()->randomElement(['MINIBUS', 'BUS', 'CAMIONETA', 'VAN']),
            'service_date' => fake()->dateTimeBetween('-2 months', 'now')->format('Y-m-d'),
            'driver_name' => strtoupper(fake()->name()),
            'plate_number' => strtoupper(fake()->bothify('??#-###')),
            'responsible_person' => strtoupper(fake()->lastName().' '.fake()->lastName()),
            'service_type' => fake()->randomElement(['CAMPAMENT', 'TRANSPORTE', 'TRASLADO']),
            'ruc' => '20554556192',
            'driver_dni' => (string) fake()->numerify('########'),
            'category' => fake()->randomElement(['A', 'B', 'C']),
            'coordinator' => fake()->name(),
        ];
    }
}
