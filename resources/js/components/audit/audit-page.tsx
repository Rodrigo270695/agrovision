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

type TrailPoint = { latitude: number; longitude: number; at: string | null };

type Trail = {
    user_id: number;
    user_name: string;
    points: TrailPoint[];
};

type PageProps = {
    logs: Paginator;
    filters: { search: string; action: string; module: string };
    modules: string[];
    presences: Presence[];
    stats: { today: number; active: number; located: number; modules: number };
    moduleSummary: ModuleRow[];
    actionsToday: Record<string, number>;
    hoursToday: number[];
    trails: Trail[];
};

const tabs = [
    { id: 'panel', label: 'Panel' },
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

const trailColors = ['#1d4ed8', '#059669', '#d97706', '#e11d48', '#7c3aed', '#0f766e'];

function AuditMap({
    points,
    trails,
}: {
    points: Presence[];
    trails: Trail[];
}) {
    const host = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const layerRef = useRef<any>(null);
    const fitted = useRef(false);
    const located = useMemo(
        () =>
            points.filter(
                (point) => point.latitude !== null && point.longitude !== null,
            ),
        [points],
    );

    useEffect(() => {
        const node = host.current;

        if (!node || located.length === 0) {
            return;
        }

        let cancelled = false;

        const draw = () => {
            const L = (window as Window & { L?: any }).L;

            if (!L || cancelled || !host.current) {
                return;
            }

            if (!mapRef.current) {
                mapRef.current = L.map(host.current).setView(
                    [located[0].latitude, located[0].longitude],
                    13,
                );
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '&copy; OpenStreetMap',
                }).addTo(mapRef.current);
                layerRef.current = L.layerGroup().addTo(mapRef.current);
            }

            layerRef.current.clearLayers();
            const coords: [number, number][] = [];

            trails.forEach((trail, index) => {
                const line = trail.points.map(
                    (point) => [point.latitude, point.longitude] as [number, number],
                );

                if (line.length > 1) {
                    L.polyline(line, {
                        color: trailColors[index % trailColors.length],
                        weight: 4,
                        opacity: 0.85,
                    }).addTo(layerRef.current);
                }
            });

            located.forEach((point) => {
                const coord: [number, number] = [
                    point.latitude as number,
                    point.longitude as number,
                ];
                coords.push(coord);
                const label = point.user_name
                    .replaceAll('&', '&amp;')
                    .replaceAll('<', '&lt;')
                    .replaceAll('>', '&gt;');
                L.circleMarker(coord, {
                    radius: point.active ? 9 : 6,
                    color: point.active ? '#059669' : '#64748b',
                    fillColor: point.active ? '#34d399' : '#cbd5e1',
                    fillOpacity: 0.95,
                    weight: 2,
                })
                    .addTo(layerRef.current)
                    .bindPopup(
                        `<strong>${label}</strong><br>${point.active ? 'En línea' : 'Última señal'} · ${point.last_seen_at ?? ''}<br>${point.browser ?? ''} · ${point.ip ?? ''}`,
                    );
            });

            if (!fitted.current && coords.length > 0) {
                fitted.current = true;
                mapRef.current.fitBounds(coords, { padding: [28, 28], maxZoom: 15 });
            }
        };

        if ((window as Window & { L?: unknown }).L) {
            draw();
        } else if (!document.querySelector('script[data-audit-leaflet]')) {
            const css = document.createElement('link');
            css.rel = 'stylesheet';
            css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(css);
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.dataset.auditLeaflet = '1';
            script.onload = draw;
            document.body.appendChild(script);
        }

        return () => {
            cancelled = true;
        };
    }, [located, trails]);

    useEffect(() => {
        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, []);

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

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
    const width = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;

    return (
        <div className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-2 text-sm">
            <span className="truncate text-brand-800">{label}</span>
            <div className="h-2 overflow-hidden rounded-full bg-brand-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${width}%` }} />
            </div>
            <span className="text-right text-xs font-semibold text-brand-700">{value}</span>
        </div>
    );
}

export function AuditPage() {
    const page = usePage().props as unknown as PageProps;
    const { logs, filters, modules, moduleSummary, actionsToday, hoursToday } = page;
    const [tab, setTab] = useState<TabId>('panel');
    const [search, setSearch] = useState(filters.search);
    const [openId, setOpenId] = useState<number | null>(null);
    const [presences, setPresences] = useState(page.presences);
    const [trails, setTrails] = useState(page.trails);
    const [liveAt, setLiveAt] = useState<string | null>(null);
    const active = presences.filter((row) => row.active);
    const hourMax = Math.max(1, ...hoursToday);
    const actionMax = Math.max(1, ...Object.values(actionsToday));

    useEffect(() => {
        if (tab !== 'mapa' && tab !== 'activos' && tab !== 'panel') {
            return;
        }

        let cancelled = false;

        const pull = () => {
            void fetch('/auditoria/en-vivo', {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            })
                .then((response) => (response.ok ? response.json() : null))
                .then((payload) => {
                    if (!payload || cancelled) {
                        return;
                    }

                    setPresences(payload.presences);
                    setTrails(payload.trails);
                    setLiveAt(
                        new Date().toLocaleTimeString('es-PE', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                        }),
                    );
                })
                .catch(() => undefined);
        };

        pull();
        const timer = window.setInterval(pull, 15_000);

        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [tab]);

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
                    { label: 'Hoy', value: page.stats.today, tone: 'navy' },
                    { label: 'Activos', value: active.length, tone: 'emerald' },
                    {
                        label: 'Con GPS',
                        value: presences.filter((row) => row.latitude !== null).length,
                        tone: 'sky',
                    },
                    { label: 'Módulos hoy', value: page.stats.modules, tone: 'amber' },
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

            {tab === 'panel' ? (
                <div className="grid gap-3 lg:grid-cols-2">
                    <PlatformContentPanel>
                        <div className="border-b border-brand-100 px-3 py-2 text-sm font-semibold text-brand-900">
                            Movimientos de hoy por hora
                        </div>
                        <div className="flex h-40 items-end gap-1 px-3 py-3">
                            {hoursToday.map((value, hour) => (
                                <div key={hour} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                                    <div
                                        className="w-full rounded-t bg-brand-500"
                                        style={{ height: `${Math.max(value > 0 ? 8 : 2, (value / hourMax) * 112)}px` }}
                                        title={`${hour}:00 · ${value}`}
                                    />
                                    {hour % 3 === 0 ? (
                                        <span className="text-[9px] text-muted-foreground">{hour}</span>
                                    ) : (
                                        <span className="text-[9px] text-transparent">.</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </PlatformContentPanel>
                    <PlatformContentPanel>
                        <div className="border-b border-brand-100 px-3 py-2 text-sm font-semibold text-brand-900">
                            Acciones de hoy
                        </div>
                        <div className="space-y-2 p-3">
                            {Object.keys(actionsToday).length === 0 ? (
                                <p className="text-sm text-muted-foreground">Todavía no hay movimientos hoy.</p>
                            ) : (
                                Object.entries(actionsToday).map(([action, total]) => (
                                    <BarRow
                                        key={action}
                                        label={actionLabel[action] ?? action}
                                        value={total}
                                        max={actionMax}
                                    />
                                ))
                            )}
                        </div>
                    </PlatformContentPanel>
                    <PlatformContentPanel className="lg:col-span-2">
                        <div className="border-b border-brand-100 px-3 py-2 text-sm font-semibold text-brand-900">
                            Módulos · últimos 7 días
                        </div>
                        <div className="space-y-2 p-3">
                            {moduleSummary.map((row) => (
                                <BarRow
                                    key={row.module}
                                    label={row.module}
                                    value={row.total}
                                    max={moduleSummary[0]?.total ?? 1}
                                />
                            ))}
                        </div>
                    </PlatformContentPanel>
                </div>
            ) : null}

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
                        Se actualiza solo cada 15 segundos. La línea es el recorrido de las últimas 8 horas y el punto es dónde está ahora.
                        {liveAt ? ` Última lectura ${liveAt}.` : ''}
                    </p>
                    <AuditMap points={presences} trails={trails} />
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
