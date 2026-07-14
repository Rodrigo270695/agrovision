<?php

namespace Database\Factories;

use App\Models\Period;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Period>
 */
class PeriodFactory extends Factory
{
    protected $model = Period::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $date = fake()->dateTimeBetween('-6 months', 'now');

        return [
            'name' => 'Periodo '.fake()->monthName().' '.$date->format('Y'),
            'date' => $date->format('Y-m-d'),
            'status' => fake()->randomElement(['active', 'inactive']),
        ];
    }
}
