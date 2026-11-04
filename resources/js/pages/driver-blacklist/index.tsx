import { Head, router, usePage } from '@inertiajs/react';
import { Ban, Search, ShieldOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    DriverBlacklistModal,
    type DriverBlacklistDraft,
} from '@/components/drivers/driver-blacklist-modal';
import {
    PlatformContentPanel,
    PlatformPageShell,
} from '@/components/platform';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCan } from '@/hooks/use-can';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type Entry = {
    id: number;
    driver_name: string;
    driver_dni?: string | null;
    plate_number?: string | null;
    reason_code: string;
    reason_label: string;
    reason_detail?: string | null;
    photo_url?: string | null;
    source: string;
    is_active: boolean;
    created_at?: string | null;
    lifted_at?: string | null;
    creator_name?: string | null;
};

type PageProps = {
    entries: {
        data: Entry[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search: string;
        active: boolean;
    };
    stats: {
        active: number;
        total: number;
    };
};

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function DriverBlacklistIndex() {
    const { entries, filters, stats } = usePage().props as unknown as PageProps;
    const { can } = useCan();
    const [search, setSearch] = useState(filters.search ?? '');
    const [manualOpen, setManualOpen] = useState(false);
    const rows = entries?.data ?? [];

    const manualDraft = useMemo<DriverBlacklistDraft>(
        () => ({
            driver_name: '',
            source: 'manual',
        }),
        [],
    );

    const visit = (next: Partial<PageProps['filters']> & { page?: number }) => {
        router.get(
            '/lista-negra-conductores',
            {
                search: next.search ?? search,
                active:
                    next.active === undefined
                        ? filters.active
                            ? 1
                            : 0
                        : next.active
                          ? 1
                          : 0,
                page: next.page,
            },
            { preserveState: true, replace: true },
        );
    };

    return (
        <>
            <Head title="Lista negra de conductores" />
            <PlatformPageShell>
                <div className="flex flex-col gap-4 px-4 pt-4 sm:px-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="font-display text-2xl font-bold tracking-tight text-brand-800">
                                Lista negra
                            </h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Conductores restringidos por estado etílico,
                                suplantación u otro motivo, con evidencia
                                fotográfica.
                            </p>
                        </div>
                        {can('driver_blacklists.create') ? (
                            <Button
                                type="button"
                                onClick={() => setManualOpen(true)}
                                className="cursor-pointer bg-brand-700 text-white hover:bg-brand-800"
                            >
                                <Ban className="size-4" />
                                Registrar
                            </Button>
                        ) : null}
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm">
                        <span className="rounded-xl bg-red-50 px-3 py-1.5 font-medium text-red-800">
                            Activos: {stats?.active ?? 0}
                        </span>
                        <span className="rounded-xl bg-brand-50 px-3 py-1.5 font-medium text-brand-800">
                            Histórico: {stats?.total ?? 0}
                        </span>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-brand-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        visit({ search, page: 1 });
                                    }
                                }}
                                placeholder="Buscar por nombre, DNI o placa"
                                className="h-10 border-brand-200 bg-white pl-9"
                            />
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => visit({ search, page: 1 })}
                            className="cursor-pointer border-brand-300"
                        >
                            Buscar
                        </Button>
                        <Button
                            type="button"
                            variant={filters.active ? 'default' : 'outline'}
                            onClick={() =>
                                visit({
                                    active: true,
                                    search,
                                    page: 1,
                                })
                            }
                            className={cn(
                                'cursor-pointer',
                                filters.active &&
                                    'bg-brand-700 text-white hover:bg-brand-800',
                            )}
                        >
                            Activos
                        </Button>
                        <Button
                            type="button"
                            variant={!filters.active ? 'default' : 'outline'}
                            onClick={() =>
                                visit({
                                    active: false,
                                    search,
                                    page: 1,
                                })
                            }
                            className={cn(
                                'cursor-pointer',
                                !filters.active &&
                                    'bg-brand-700 text-white hover:bg-brand-800',
                            )}
                        >
                            Todos
                        </Button>
                    </div>
                </div>

                <PlatformContentPanel className="mt-4 p-3 sm:p-4">
                    {rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                            <ShieldOff className="size-8 text-brand-300" />
                            <p className="text-sm font-medium text-brand-800">
                                Sin registros
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Desde inspección, alcohómetro o inducción puedes
                                enviar un conductor aquí.
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-3">
                            {rows.map((entry) => (
                                <li
                                    key={entry.id}
                                    className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-white p-3 sm:flex-row sm:items-start"
                                >
                                    {entry.photo_url ? (
                                        <a
                                            href={entry.photo_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="shrink-0"
                                        >
                                            <img
                                                src={entry.photo_url}
                                                alt={`Evidencia ${entry.driver_name}`}
                                                className="h-24 w-28 rounded-xl border border-brand-100 object-cover"
                                            />
                                        </a>
                                    ) : null}
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="font-semibold text-brand-800">
                                                {entry.driver_name}
                                            </p>
                                            <span
                                                className={cn(
                                                    'rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                    entry.is_active
                                                        ? 'bg-red-50 text-red-800'
                                                        : 'bg-slate-100 text-slate-600',
                                                )}
                                            >
                                                {entry.is_active
                                                    ? 'Activo'
                                                    : 'Levantado'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            {[
                                                entry.driver_dni
                                                    ? `DNI ${entry.driver_dni}`
                                                    : null,
                                                entry.plate_number
                                                    ? `Placa ${entry.plate_number}`
                                                    : null,
                                                entry.reason_label,
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                        {entry.reason_detail ? (
                                            <p className="text-sm text-brand-700">
                                                {entry.reason_detail}
                                            </p>
                                        ) : null}
                                        <p className="text-[11px] text-muted-foreground">
                                            {formatDate(entry.created_at)}
                                            {entry.creator_name
                                                ? ` · ${entry.creator_name}`
                                                : ''}
                                        </p>
                                    </div>
                                    {entry.is_active &&
                                    can('driver_blacklists.update') ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                router.post(
                                                    `/lista-negra-conductores/${entry.id}/levantar`,
                                                    {},
                                                    { preserveScroll: true },
                                                )
                                            }
                                            className="cursor-pointer border-brand-300 text-brand-700"
                                        >
                                            Levantar
                                        </Button>
                                    ) : null}
                                </li>
                            ))}
                        </ul>
                    )}
                </PlatformContentPanel>
            </PlatformPageShell>

            <DriverBlacklistModal
                open={manualOpen}
                draft={manualDraft}
                onClose={() => setManualOpen(false)}
            />
        </>
    );
}

DriverBlacklistIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Lista negra', href: '/lista-negra-conductores' },
    ],
};
