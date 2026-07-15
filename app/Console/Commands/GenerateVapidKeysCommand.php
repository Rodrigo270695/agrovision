<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class GenerateVapidKeysCommand extends Command
{
    protected $signature = 'webpush:vapid';

    protected $description = 'Genera claves VAPID para notificaciones push y las muestra para .env';

    public function handle(): int
    {
        try {
            $keys = VAPID::createVapidKeys();
        } catch (\Throwable $exception) {
            $this->components->error('No se pudieron generar claves con OpenSSL EC.');
            $this->line('Usa en su lugar: npx web-push generate-vapid-keys');
            $this->line($exception->getMessage());

            return self::FAILURE;
        }

        $this->components->info('Añade estas variables a tu archivo .env:');
        $this->line('');
        $this->line('VAPID_PUBLIC_KEY='.$keys['publicKey']);
        $this->line('VAPID_PRIVATE_KEY='.$keys['privateKey']);
        $this->line('VAPID_SUBJECT=mailto:admin@agrovision.test');
        $this->line('');

        return self::SUCCESS;
    }
}
