<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Database\Concerns\HasDatabase;
use Stancl\Tenancy\Database\Concerns\HasDomains;
use Stancl\Tenancy\Database\Models\Domain;
use Stancl\Tenancy\Database\Models\Tenant as BaseTenant;

/**
 * @property string $id
 * @property string $name
 * @property string $status
 * @property-read Collection<int, Domain> $domains
 */
class Tenant extends BaseTenant implements TenantWithDatabase
{
    use HasDatabase, HasDomains;

    public $incrementing = false;

    protected $keyType = 'string';

    public const STATUS_ACTIVE = 'active';

    public const STATUS_SUSPENDED = 'suspended';

    /**
     * @return list<string>
     */
    public static function getCustomColumns(): array
    {
        return [
            'id',
            'name',
            'status',
        ];
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function schemaName(): string
    {
        return $this->database()->getName();
    }

    /**
     * @return list<string>
     */
    public function hostnames(): array
    {
        return $this->domains->pluck('domain')->all();
    }

    public function domainForRequest(?Request $request = null): ?string
    {
        $request ??= request();
        $host = $request->getHost();

        $exact = $this->domains->firstWhere('domain', $this->id.'.'.$host);

        if ($exact) {
            return $exact->domain;
        }

        return $this->domains->first()?->domain;
    }

    public function url(string $path = '/', ?Request $request = null): string
    {
        $request ??= request();
        $domain = $this->domainForRequest($request);

        if (! $domain) {
            return '/'.ltrim($path, '/');
        }

        $scheme = $request->getScheme();
        $port = $request->getPort();
        $portSuffix = in_array($port, [80, 443, null], true) ? '' : ':'.$port;

        return $scheme.'://'.$domain.$portSuffix.'/'.ltrim($path, '/');
    }
}
