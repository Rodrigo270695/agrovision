import { router, usePage } from '@inertiajs/react';
import { MapPin, Search } from 'lucide-react';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
    PlatformContentPanel,
    PlatformHero,
    PlatformPageShell,
} from '@/components/platform';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ChangeRow = {
    field: string;
    before: string | null;
    after: string | null;
};

type LogItem = {
    id: number;
    created_at: string | null;
    user_name: string;
    action: string;
    module: string;
    record_code: string | null;
    changes: ChangeRow[];
    ip: string | null;
    browser: string | null;
};

type Paginator = {
    data: LogItem[];
    current_page: number;
    last_page: number;
    total: number;
    links: Array<{ url: string | null; label: string; active: boolean }>;
};

type Presence = {
    id: number;
    user_name: string;
    latitude: number | null;
    longitude: number | null;
    accuracy: number | null;
    ip: string | null;
    browser: string | null;
    last_seen_at: string | null;
    active: boolean;
};

type ModuleRow = { module: string; total: number };

type PageProps = {
    logs: Paginator;
    filters: { search: string; action: string; module: string };
    modules: string[];
    presences: Presence[];
    stats: { today: number; active: number; located: number; modules: number };
    moduleSummary: ModuleRow[];
};

const tabs = [
    { id: 'actividad', label: 'Actividad' },
    { id: 'activos', label: 'Usuarios activos' },
    { id: 'mapa', label: 'Mapa' },
    { id: 'modulos', label: 'Módulos' },
] as const;

type TabId = (typeof tabs)[number]['id'];

const actionLabel: Record<string, string> = {
    created: 'Creación',
    updated: 'Edición',
    deleted: 'Eliminación',
    login: 'Ingreso',
    logout: 'Salida',
    location: 'Ubicación',
};

function actionClass(action: string): string {
    if (action === 'created') {
        return 'bg-emerald-50 text-emerald-700';
    }

    if (action === 'deleted') {
        return 'bg-rose-50 text-rose-700';
    }

    if (action === 'updated') {
        return 'bg-sky-50 text-sky-700';
    }

    return 'bg-brand-50 text-brand-700';
}

function AuditMap({ points }: { points: Presence[] }) {
    const host = useRef<HTMLDivElement>(null);
    const located = useMemo(
        () =>
            points.filter(
                (point) => point.latitude !== null && point.longitude !== null,
            ),
        [points],
    );
    const signature = located
        .map((point) => `${point.id}:${point.latitude}:${point.longitude}`)
        .join('|');

    useEffect(() => {
        const node = host.current;

        if (!node || located.length === 0) {
            return;
        }

        let map: { remove: () => void } | null = null;
        let cancelled = false;

        const start = () => {
            const L = (window as Window & { L?: any }).L;

            if (!L || cancelled || !host.current) {
                return;
            }

            const first: [number, number] = [
                located[0].latitude as number,
                located[0].longitude as number,
            ];
            const instance = L.map(host.current).setView(first, 6);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; OpenStreetMap',
            }).addTo(instance);

            const coords: [number, number][] = located.map((point) => {
                const coord: [number, number] = [
                    point.latitude as number,
                    point.longitude as number,
                ];
                const label = point.user_name
                    .replaceAll('&', '&amp;')
                    .replaceAll('<', '&lt;')
                    .replaceAll('>', '&gt;');
                L.marker(coord)
                    .addTo(instance)
                    .bindPopup(
                        `<strong>${label}</strong><br>${point.last_seen_at ?? ''}<br>${point.browser ?? ''} · ${point.ip ?? ''}`,
                    );

                return coord;
            });

            if (coords.length > 1) {
                instance.fitBounds(coords, { padding: [28, 28] });
            }

            map = instance;
        };

        if ((window as Window & { L?: unknown }).L) {
            start();
        } else {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = start;
            document.body.appendChild(script);
        }

        return () => {
            cancelled = true;
            map?.remove();
        };
        // signature cambia solo cuando se mueven los puntos
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signature]);

    if (located.length === 0) {
        return (
            <div className="flex h-80 items-center justify-center px-6 text-center text-sm text-muted-foreground">
                Todavía no hay coordenadas. Cada usuario debe aceptar la
                ubicación del navegador al entrar.
            </div>
        );
    }

    return (
        <div
            ref={host}
            className="h-[28rem] w-full"
            role="application"
            aria-label="Mapa de usuarios"
        />
    );
}

export function AuditPage() {
    const { logs, filters, modules, presences, stats, moduleSummary } =
        usePage().props as unknown as PageProps;
    const [tab, setTab] = useState<TabId>('actividad');
    const [search, setSearch] = useState(filters.search);
    const [openId, setOpenId] = useState<number | null>(null);
    const active = presences.filter((row) => row.active);

    const apply = (next: Partial<PageProps['filters']>) => {
        router.get(
            '/auditoria',
            {
                search: next.search ?? filters.search,
                action: next.action ?? filters.action,
                module: next.module ?? filters.module,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    return (
        <PlatformPageShell>
            <PlatformHero
                eyebrow="Control · Acceso"
                title="Auditoría"
                description="Quién hizo cada cambio, en qué módulo, desde qué IP y navegador."
                stats={[
                    { label: 'Hoy', value: stats.today, tone: 'navy' },
                    { label: 'Activos', value: stats.active, tone: 'emerald' },
                    { label: 'Con GPS', value: stats.located, tone: 'sky' },
                    { label: 'Módulos hoy', value: stats.modules, tone: 'amber' },
                ]}
            />

            <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Secciones de auditoría">
                {tabs.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={tab === item.id}
                        onClick={() => setTab(item.id)}
                        className={cn(
                            'cursor-pointer rounded-xl px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none',
                            tab === item.id
                                ? 'bg-brand-500 text-white'
                                : 'bg-white text-brand-800 hover:bg-brand-50',
                        )}
                    >
                        {item.label}
                    </button>
                ))}
            </div>

            {tab === 'actividad' ? (
                <PlatformContentPanel>
                    <form
                        className="flex flex-col gap-2 border-b border-brand-100 p-3 sm:flex-row"
                        onSubmit={(event) => {
                            event.preventDefault();
                            apply({ search });
                        }}
                    >
                        <label className="relative min-w-0 flex-1">
                            <span className="sr-only">Buscar</span>
                            <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Usuario, código, módulo o IP"
                                className="h-9 w-full rounded-xl border border-brand-200 bg-white pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none"
                            />
                        </label>
                        <select
                            value={filters.action}
                            aria-label="Acción"
                            onChange={(event) => apply({ action: event.target.value })}
                            className="h-9 rounded-xl border border-brand-200 bg-white px-2 text-sm"
                        >
                            <option value="">Todas las acciones</option>
                            {Object.entries(actionLabel).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filters.module}
                            aria-label="Módulo"
                            onChange={(event) => apply({ module: event.target.value })}
                            className="h-9 rounded-xl border border-brand-200 bg-white px-2 text-sm"
                        >
                            <option value="">Todos los módulos</option>
                            {modules.map((module) => (
                                <option key={module} value={module}>
                                    {module}
                                </option>
                            ))}
                        </select>
                        <Button type="submit" size="sm" className="cursor-pointer rounded-xl">
                            Buscar
                        </Button>
                    </form>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] text-left text-sm">
                            <thead className="bg-brand-50/80 text-xs tracking-wide text-brand-700 uppercase">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Fecha</th>
                                    <th className="px-3 py-2 font-semibold">Usuario</th>
                                    <th className="px-3 py-2 font-semibold">Acción</th>
                                    <th className="px-3 py-2 font-semibold">Módulo</th>
                                    <th className="px-3 py-2 font-semibold">Registro</th>
                                    <th className="px-3 py-2 font-semibold">Cambios</th>
                                    <th className="px-3 py-2 font-semibold">IP</th>
                                    <th className="px-3 py-2 font-semibold">Navegador</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-3 py-10 text-center text-muted-foreground">
                                            Aún no hay movimientos. Aparecen al crear, editar, eliminar o entrar.
                                        </td>
                                    </tr>
                                ) : (
                                    logs.data.map((log) => (
                                        <Fragment key={log.id}>
                                            <tr className="border-t border-brand-100">
                                                <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                                                    {log.created_at}
                                                </td>
                                                <td className="px-3 py-2 font-medium">{log.user_name}</td>
                                                <td className="px-3 py-2">
                                                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', actionClass(log.action))}>
                                                        {actionLabel[log.action] ?? log.action}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2">{log.module}</td>
                                                <td className="px-3 py-2 font-mono text-xs">{log.record_code ?? '—'}</td>
                                                <td className="px-3 py-2">
                                                    <button
                                                        type="button"
                                                        className="cursor-pointer text-brand-600 underline-offset-2 hover:underline focus-visible:outline-none"
                                                        onClick={() => setOpenId(openId === log.id ? null : log.id)}
                                                    >
                                                        {log.changes.length} campo{log.changes.length === 1 ? '' : 's'}
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 font-mono text-xs">{log.ip ?? '—'}</td>
                                                <td className="px-3 py-2">{log.browser ?? '—'}</td>
                                            </tr>
                                            {openId === log.id ? (
                                                <tr key={`${log.id}-detail`} className="border-t border-brand-50 bg-brand-50/40">
                                                    <td colSpan={8} className="px-3 py-2">
                                                        {log.changes.length === 0 ? (
                                                            <p className="text-xs text-muted-foreground">Sin detalle de campos.</p>
                                                        ) : (
                                                            <ul className="space-y-1 text-xs">
                                                                {log.changes.map((change) => (
                                                                    <li key={`${log.id}-${change.field}`}>
                                                                        <span className="font-semibold">{change.field}</span>
                                                                        {': '}
                                                                        <span className="text-muted-foreground">{change.before ?? '—'}</span>
                                                                        {' → '}
                                                                        <span>{change.after ?? '—'}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </td>
                                                </tr>
                                            ) : null}
                                        </Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {logs.last_page > 1 ? (
                        <div className="flex items-center justify-between border-t border-brand-100 px-3 py-2 text-xs text-muted-foreground">
                            <span>
                                {logs.total} registros · página {logs.current_page} de {logs.last_page}
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="cursor-pointer"
                                    disabled={logs.current_page <= 1}
                                    onClick={() =>
                                        router.get('/auditoria', { ...filters, page: logs.current_page - 1 }, { preserveState: true, preserveScroll: true })
                                    }
                                >
                                    Anterior
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="cursor-pointer"
                                    disabled={logs.current_page >= logs.last_page}
                                    onClick={() =>
                                        router.get('/auditoria', { ...filters, page: logs.current_page + 1 }, { preserveState: true, preserveScroll: true })
                                    }
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </div>
                    ) : null}
                </PlatformContentPanel>
            ) : null}

            {tab === 'activos' ? (
                <PlatformContentPanel>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[720px] text-left text-sm">
                            <thead className="bg-brand-50/80 text-xs tracking-wide text-brand-700 uppercase">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">Usuario</th>
                                    <th className="px-3 py-2 font-semibold">Estado</th>
                                    <th className="px-3 py-2 font-semibold">Última señal</th>
                                    <th className="px-3 py-2 font-semibold">IP</th>
                                    <th className="px-3 py-2 font-semibold">Navegador</th>
                                    <th className="px-3 py-2 font-semibold">GPS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {active.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                                            Nadie con señal en los últimos 20 minutos.
                                        </td>
                                    </tr>
                                ) : (
                                    active.map((row) => (
                                        <tr key={row.id} className="border-t border-brand-100">
                                            <td className="px-3 py-2 font-medium">{row.user_name}</td>
                                            <td className="px-3 py-2">
                                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                                    En línea
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-muted-foreground">{row.last_seen_at}</td>
                                            <td className="px-3 py-2 font-mono text-xs">{row.ip ?? '—'}</td>
                                            <td className="px-3 py-2">{row.browser ?? '—'}</td>
                                            <td className="px-3 py-2">
                                                {row.latitude !== null ? (
                                                    <span className="inline-flex items-center gap-1">
                                                        <MapPin className="size-3.5" aria-hidden />
                                                        {row.latitude.toFixed(4)}, {row.longitude?.toFixed(4)}
                                                    </span>
                                                ) : (
                                                    'Sin permiso'
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </PlatformContentPanel>
            ) : null}

            {tab === 'mapa' ? (
                <PlatformContentPanel>
                    <p className="border-b border-brand-100 px-3 py-2 text-xs text-muted-foreground">
                        Al entrar, el navegador pide la ubicación una vez. Si la rechazan, igual quedan como activos, sin punto en el mapa.
                    </p>
                    <AuditMap points={presences} />
                </PlatformContentPanel>
            ) : null}

            {tab === 'modulos' ? (
                <PlatformContentPanel>
                    <div className="divide-y divide-brand-100">
                        {moduleSummary.length === 0 ? (
                            <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                                Sin movimientos en los últimos 7 días.
                            </p>
                        ) : (
                            moduleSummary.map((row) => (
                                <div key={row.module} className="flex items-center justify-between px-3 py-2.5 text-sm">
                                    <span className="font-medium">{row.module}</span>
                                    <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
                                        {row.total}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </PlatformContentPanel>
            ) : null}
        </PlatformPageShell>
    );
}
