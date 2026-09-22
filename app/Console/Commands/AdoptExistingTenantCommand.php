<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Models\TenantSetting;
use App\Support\TenantModules;
use App\Support\TenantTables;
use Database\Seeders\CentralUserSeeder;
use Illuminate\Console\Command;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class AdoptExistingTenantCommand extends Command
{
    protected $signature = 'tenants:adopt-current
        {--slug=agrovision : Identificador / subdominio del tenant}
        {--name=Agrovision : Nombre visible de la empresa}';

    protected $description = 'Mueve la data actual del schema public al primer tenant (PostgreSQL).';

    public function handle(): int
    {
        if (config('database.default') !== 'pgsql') {
            $this->error('Este comando solo funciona con PostgreSQL.');

            return self::FAILURE;
        }

        $slug = Str::slug((string) $this->option('slug'));
        $name = (string) $this->option('name');
        $schema = 'tenant_'.$slug;

        if (! Schema::connection('central')->hasTable('users')) {
            $this->error('No hay tabla users en public. Nada que adoptar.');

            return self::FAILURE;
        }

        if (Tenant::query()->where('id', $slug)->exists()) {
            $this->error("El tenant [{$slug}] ya existe.");

            return self::FAILURE;
        }

        $this->info("Adoptando data actual como tenant [{$slug}] → schema {$schema}");

        $tenant = Tenant::withoutEvents(function () use ($slug, $name) {
            return Tenant::create([
                'id' => $slug,
                'name' => $name,
                'status' => Tenant::STATUS_ACTIVE,
            ]);
        });

        foreach (config('tenancy.base_domains', []) as $base) {
            $tenant->domains()->firstOrCreate(['domain' => $slug.'.'.$base]);
        }

        DB::connection('central')->statement('CREATE SCHEMA IF NOT EXISTS "'.$schema.'"');

        $moved = [];

        foreach (TenantTables::names() as $table) {
            if (! Schema::connection('central')->hasTable($table)) {
                continue;
            }

            DB::connection('central')->statement('ALTER TABLE public.'.$table.' SET SCHEMA '.$schema);
            $moved[] = $table;
        }

        $this->line('Tablas movidas: '.implode(', ', $moved));

        $this->recreateCentralAuthTables();
        $this->movePublicStorage($slug);

        tenancy()->initialize($tenant);

        $this->recordExistingTenantMigrations($schema);
        Artisan::call('migrate', [
            '--force' => true,
            '--path' => [database_path('migrations/tenant')],
            '--realpath' => true,
        ]);

        TenantSetting::query()->firstOrCreate(
            [],
            [
                'name' => $name,
                'primary_color' => '#1a2b4c',
                'modules' => TenantModules::defaults(),
            ],
        );

        tenancy()->end();

        (new CentralUserSeeder)->run();

        $this->info('Listo. Entra al panel central y usa:');
        $this->line('  • Central: http://localhost  (soporte@gindelsi.pe / password)');
        $this->line('  • Tenant:  http://'.$slug.'.localhost');
        $this->line('Añade en el hosts de Windows: 127.0.0.1 '.$slug.'.localhost');

        return self::SUCCESS;
    }

    private function recreateCentralAuthTables(): void
    {
        $central = Schema::connection('central');

        if (! $central->hasTable('users')) {
            $central->create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password');
                $table->rememberToken();
                $table->timestamps();
            });
        }

        if (! $central->hasTable('password_reset_tokens')) {
            $central->create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        if (! $central->hasTable('sessions')) {
            $central->create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->foreignId('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }
    }

    private function recordExistingTenantMigrations(string $schema): void
    {
        if (! Schema::hasTable('migrations')) {
            Schema::create('migrations', function (Blueprint $table) {
                $table->id();
                $table->string('migration');
                $table->integer('batch');
            });
        }

        $skip = [
            '2026_09_22_000001_create_tenant_settings_table',
            '2026_09_22_000002_add_is_support_to_users_table',
        ];

        $files = collect(File::files(database_path('migrations/tenant')))
            ->map(fn (\SplFileInfo $file): string => $file->getFilenameWithoutExtension())
            ->reject(fn (string $name): bool => in_array($name, $skip, true));

        foreach ($files as $migration) {
            DB::table('migrations')->updateOrInsert(
                ['migration' => $migration],
                ['batch' => 1],
            );
        }
    }

    private function movePublicStorage(string $slug): void
    {
        $from = storage_path('app/public');
        $to = storage_path('app/public/tenants/'.$slug);

        if (! is_dir($from)) {
            return;
        }

        File::ensureDirectoryExists($to);

        foreach (File::directories($from) as $directory) {
            $basename = basename($directory);

            if ($basename === 'tenants') {
                continue;
            }

            File::copyDirectory($directory, $to.DIRECTORY_SEPARATOR.$basename);
        }

        foreach (File::files($from) as $file) {
            File::copy($file->getPathname(), $to.DIRECTORY_SEPARATOR.$file->getFilename());
        }
    }
}
