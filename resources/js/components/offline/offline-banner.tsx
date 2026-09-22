import { CloudOff, RefreshCw, Wifi } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { useOfflineStatus } from '@/hooks/use-offline-status';
import { flushOutbox } from '@/lib/offline/sync';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function OfflineBanner() {
    const page = usePage();
    const { online, pending, syncing, lastError } = useOfflineStatus();

    if (page.props.central) {
        return null;
    }

    if (online && pending === 0 && !syncing && !lastError) {
        return null;
    }

    const tone = !online
        ? 'offline'
        : lastError
          ? 'error'
          : 'pending';

    return (
        <div
            role="status"
            className={cn(
                'shrink-0 border-b px-3 py-1.5',
                tone === 'offline' &&
                    'border-amber-300/80 bg-amber-50 text-amber-950',
                tone === 'error' &&
                    'border-red-200 bg-red-50 text-red-900',
                tone === 'pending' &&
                    'border-sky-200 bg-sky-50 text-sky-950',
            )}
        >
            <div className="mx-auto flex max-w-6xl items-center gap-2">
                {!online ? (
                    <CloudOff className="size-3.5 shrink-0" aria-hidden />
                ) : (
                    <Wifi className="size-3.5 shrink-0" aria-hidden />
                )}
                <p className="min-w-0 flex-1 truncate text-xs">
                    {!online
                        ? 'Sin conexión. Ves los datos ya cargados. Crear o editar espera a que vuelva internet, salvo inspecciones y fotos.'
                        : syncing
                          ? `Sincronizando ${pending} cambio${pending === 1 ? '' : 's'}…`
                          : lastError
                            ? lastError
                            : `${pending} cambio${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de enviar.`}
                </p>
                {online && pending > 0 ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={syncing}
                        onClick={() => {
                            void flushOutbox();
                        }}
                        className="h-7 shrink-0 cursor-pointer px-2.5 text-[0.7rem]"
                    >
                        <RefreshCw
                            className={cn(
                                'size-3',
                                syncing && 'animate-spin',
                            )}
                        />
                        {syncing ? 'Enviando' : 'Sincronizar'}
                    </Button>
                ) : null}
            </div>
        </div>
    );
}
