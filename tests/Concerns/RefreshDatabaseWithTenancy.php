<?php

namespace Tests\Concerns;

use Illuminate\Foundation\Testing\RefreshDatabase;

trait RefreshDatabaseWithTenancy
{
    use RefreshDatabase;

    protected function migrateFreshUsing()
    {
        return [
            '--drop-views' => false,
            '--drop-types' => false,
            '--seed' => false,
            '--path' => [
                database_path('migrations'),
                database_path('migrations/tenant'),
            ],
            '--realpath' => true,
        ];
    }

    protected function afterRefreshingDatabase()
    {
        $this->setUpTenancy();
    }
}
