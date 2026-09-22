import { router, usePage } from '@inertiajs/react';
import { ShieldAlert, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'gindelsi:impersonation-banner-minimized';

export function TenantImpersonationBanner() {
    const tenant = usePage().props.tenant;
    const [minimized, setMinimized] = useState(false);

    useEffect(() => {
        try {
            setMinimized(sessionStorage.getItem(DISMISS_KEY) === '1');
        } catch {
            setMinimized(false);
        }
    }, []);

    if (!tenant?.impersonating) {
        return null;
    }

    const label = tenant.name || 'esta empresa';

    const onLeave = () => {
        try {
            sessionStorage.removeItem(DISMISS_KEY);
        } catch {
            // ignore
        }
        router.post('/impersonate/salir');
    };

    const onMinimize = () => {
        setMinimized(true);
        try {
            sessionStorage.setItem(DISMISS_KEY, '1');
        } catch {
            // ignore
        }
    };

    const onExpand = () => {
        setMinimized(false);
        try {
            sessionStorage.removeItem(DISMISS_KEY);
        } catch {
            // ignore
        }
    };

    if (minimized) {
        return (
            <div className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 md:bottom-4 md:justify-end md:px-4">
                <div className="pointer-events-auto flex max-w-full items-center gap-1.5 rounded-full border border-amber-400 bg-amber-500 text-amber-950 shadow-lg">
                    <button
                        type="button"
                        onClick={onExpand}
                        className="flex min-w-0 items-center gap-1.5 rounded-l-full py-2 pr-1 pl-3 text-left"
                    >
                        <ShieldAlert className="size-3.5 shrink-0" aria-hidden />
                        <span className="truncate text-xs font-semibold">
                            Soporte · {label}
                        </span>
                    </button>
                    <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="mr-1 h-7 shrink-0 cursor-pointer rounded-full px-2.5 text-[0.7rem]"
                        onClick={onLeave}
                    >
                        Salir
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="hidden shrink-0 border-b border-amber-300/80 bg-amber-100 px-3 py-1.5 md:block">
                <div className="mx-auto flex max-w-6xl items-center gap-2">
                    <ShieldAlert className="size-3.5 shrink-0 text-amber-800" aria-hidden />
                    <p className="min-w-0 flex-1 truncate text-xs text-amber-900">
                        <span className="font-semibold">Modo soporte</span>
                        <span className="mx-1.5 text-amber-700/50">·</span>
                        <span>Estás dentro de {label} como soporte de Gindelsi.</span>
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 shrink-0 cursor-pointer border-amber-700/40 bg-white px-2.5 text-xs text-amber-900 hover:bg-amber-50"
                        onClick={onLeave}
                    >
                        Salir de soporte
                    </Button>
                </div>
            </div>

            <div
                className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3 md:hidden"
                role="status"
            >
                <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-amber-300 bg-white/95 p-2.5 shadow-lg">
                    <div className="flex items-start gap-2">
                        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
                            <ShieldAlert className="size-3.5" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground">
                                Modo soporte
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-snug text-muted-foreground">
                                Estás dentro de {label} como soporte de Gindelsi.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            aria-label="Minimizar"
                            onClick={onMinimize}
                        >
                            <X className="size-3.5" />
                        </button>
                    </div>
                    <div className="mt-2 flex justify-end">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 cursor-pointer border-amber-700/40 px-2.5 text-xs text-amber-900 hover:bg-amber-50"
                            onClick={onLeave}
                        >
                            Salir de soporte
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}
