<?php

namespace App\Support;

final class TenantProvisioning
{
    /**
     * @param  array<string, bool>  $modules
     */
    public function __construct(
        public readonly string $adminName,
        public readonly string $adminEmail,
        public readonly string $adminPassword,
        public readonly array $modules,
        public readonly string $brandingName,
    ) {}
}
