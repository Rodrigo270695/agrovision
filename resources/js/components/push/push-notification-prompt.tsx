import { Bell, BellOff, BellRing, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { cn } from '@/lib/utils';

export function PushNotificationPrompt() {
    const [mounted, setMounted] = useState(false);
    const {
        supported,
        permission,
        subscribed,
        swReady,
        loading,
        error,
        enable,
        disable,
    } = usePushNotifications();

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted || !supported) {
        return null;
    }

    const needsAttention =
        !subscribed && (permission !== 'denied' || Boolean(error));

    const tooltipLabel = subscribed
        ? 'Notificaciones activas'
        : permission === 'denied'
          ? 'Permiso denegado en el navegador'
          : 'Activar notificaciones push';

    const Icon = subscribed
        ? BellRing
        : permission === 'denied'
          ? BellOff
          : Bell;

    return (
        <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="relative size-9 shrink-0 cursor-pointer text-muted-foreground hover:bg-brand-100 hover:text-brand-700"
                            aria-label={tooltipLabel}
                        >
                            <Icon
                                className={cn(
                                    'size-4',
                                    subscribed && 'text-emerald-600',
                                    permission === 'denied' && 'text-amber-600',
                                )}
                            />
                            {needsAttention ? (
                                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-brand-500 ring-2 ring-white" />
                            ) : null}
                        </Button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                    {tooltipLabel}
                </TooltipContent>
            </Tooltip>

            <DropdownMenuContent align="end" className="w-72 bg-white p-3">
                {subscribed ? (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-brand-700">
                                Notificaciones activas
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Recibirás avisos de consolidados y avances de
                                inspección.
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-full cursor-pointer text-xs"
                            onClick={() => void disable()}
                            disabled={loading}
                        >
                            {loading ? (
                                <LoaderCircle className="size-3.5 animate-spin" />
                            ) : (
                                'Desactivar'
                            )}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-brand-700">
                                Activar notificaciones
                            </p>
                            <p
                                className={cn(
                                    'text-xs',
                                    error ? 'text-red-600' : 'text-muted-foreground',
                                )}
                            >
                                {permission === 'denied'
                                    ? 'Permiso denegado. Actívalo en la configuración del navegador.'
                                    : (error ??
                                      (!swReady
                                          ? 'Preparando servicio… espera unos segundos.'
                                          : 'Activa la campana para recibir avisos de consolidados.'))}
                            </p>
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            className="h-8 w-full cursor-pointer bg-brand-500 text-xs text-white hover:bg-brand-700"
                            onClick={() => void enable()}
                            disabled={loading || permission === 'denied'}
                        >
                            {loading ? (
                                <LoaderCircle className="size-3.5 animate-spin" />
                            ) : (
                                'Activar'
                            )}
                        </Button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
