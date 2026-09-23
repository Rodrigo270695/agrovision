<?php

namespace App\Models;

use App\Support\TenantModules;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property string $name
 * @property string|null $legal_name
 * @property string|null $logo_path
 * @property string|null $sidebar_logo_path
 * @property string|null $login_logo_path
 * @property string $primary_color
 * @property array<string, bool> $modules
 */
class TenantSetting extends Model
{
    protected $table = 'tenant_settings';

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'legal_name',
        'logo_path',
        'sidebar_logo_path',
        'login_logo_path',
        'primary_color',
        'modules',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'modules' => 'array',
        ];
    }

    public static function current(): self
    {
        $defaults = self::defaults(tenant('name') ?? tenant('id') ?? config('app.name'));

        return static::query()->first() ?? static::query()->create($defaults);
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaults(string $name): array
    {
        return [
            'name' => $name,
            'legal_name' => null,
            'logo_path' => null,
            'sidebar_logo_path' => null,
            'login_logo_path' => null,
            'primary_color' => '#1a2b4c',
            'modules' => TenantModules::defaults(),
        ];
    }

    public function moduleEnabled(string $module): bool
    {
        $modules = TenantModules::sanitize($this->modules ?? []);

        return (bool) ($modules[$module] ?? true);
    }

    /**
     * @return array<string, mixed>
     */
    public function toFrontend(): array
    {
        $logo = $this->publicUrl($this->logo_path)
            ?? $this->publicUrl($this->login_logo_path)
            ?? $this->publicUrl($this->sidebar_logo_path);

        return [
            'name' => $this->name,
            'legal_name' => $this->legal_name,
            'logo' => $logo,
            'sidebar_logo' => $this->publicUrl($this->sidebar_logo_path) ?? $logo,
            'login_logo' => $this->publicUrl($this->login_logo_path) ?? $logo,
            'primary_color' => $this->primary_color,
            'modules' => TenantModules::sanitize($this->modules ?? []),
        ];
    }

    private function publicUrl(?string $path): ?string
    {
        if (! filled($path)) {
            return null;
        }

        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/')) {
            return $this->withCacheBust($path);
        }

        return $this->withCacheBust(Storage::disk('public')->url($path));
    }

    private function withCacheBust(string $url): string
    {
        $version = $this->updated_at?->timestamp;

        if (! $version) {
            return $url;
        }

        return $url.(str_contains($url, '?') ? '&' : '?').'v='.$version;
    }
}
