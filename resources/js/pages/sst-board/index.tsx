import { Head, router, usePage } from '@inertiajs/react';
import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import { SstBoardItemPicker } from '@/components/sst-board/sst-item-picker';
import { dashboard } from '@/routes';
import { sstBoardQueryParams } from '@/lib/sst-board-query';
import { cn } from '@/lib/utils';

type Ring = {
    key: string;
    label: string;
    ok: number;
    baja: number;
    falta: number;
    total: number;
    percent: number;
};

type Filters = {
    date_from: string | null;
    date_to: string | null;
    coordinator_id: number | null;
    inspector_id: number | null;
    vehicle_types: string[];
    template: string;
    inspection: 'actual' | 'first' | 'second';
};

type PersonOption = {
    id: number;
    name: string;
};

type PageProps = {
    templateOptions?: { value: string; label: string }[];
    items: Ring[];
    summary: {
        units: number;
        week_label: string;
        coordinators: string[];
        vehicle_types: string[];
        template_label: string;
    };
    filters: Filters;
    coordinators: PersonOption[];
    inspectors: PersonOption[];
    vehicle_options: string[];
    scoped: boolean;
};

const OK = '#22c55e';
const BAJA = '#94a3b8';
const FALTA = '#ef4444';

const selectClass =
    'mt-1 h-10 w-full cursor-pointer rounded-lg border border-[#c5d5e6] bg-white px-2 text-xs font-medium text-[#1a2b4c] normal-case';

export default function SstBoardPage() {
    const {
        items = [],
        summary,
        filters,
        coordinators,
        inspectors,
        vehicle_options: vehicleOptions,
        templateOptions = [],
        scoped,
    } = usePage<PageProps>().props;

    const visit = (next: Partial<Filters>) => {
        const merged: Filters = { ...filters, ...next };

        router.get(
            '/tablero-sst',
            sstBoardQueryParams(merged),
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const openItemDetail = (ring: Ring) => {
        router.get(
            `/tablero-sst/detalle/${encodeURIComponent(ring.key)}`,
            sstBoardQueryParams(filters),
        );
    };

    const [zoomRing, setZoomRing] = useState<Ring | null>(null);
    const [visibleItemKeys, setVisibleItemKeys] = useState<Set<string> | null>(
        null,
    );

    const handleVisibleItemsChange = useCallback(
        (keys: Set<string> | null) => {
            setVisibleItemKeys(keys);
        },
        [],
    );

    const displayedItems = useMemo(() => {
        if (visibleItemKeys === null) {
            return items;
        }

        if (visibleItemKeys.size === 0) {
            return [];
        }

        return items.filter((item) => visibleItemKeys.has(item.key));
    }, [items, visibleItemKeys]);

    const selectedVehicle =
        filters.vehicle_types.length === 1 ? filters.vehicle_types[0] : '';

    const templates =
        templateOptions.length > 0
            ? templateOptions
            : [
                  { value: 'tdp', label: 'TDP' },
                  { value: 'tdc', label: 'TDC' },
              ];

    return (
        <>
            <Head title="Tablero SST" />
            <div className="flex w-full flex-col gap-4 p-4 sm:p-6">
                <div className="border-b-2 border-[#1a2b4c] pb-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <h1 className="text-lg font-bold tracking-wide text-[#1a2b4c] uppercase sm:text-2xl">
                                Tablero de mando SST {summary.template_label}
                            </h1>
                            <p className="mt-1 text-xs text-[#5a7390]">
                                {summary.units} inspecciones. {summary.week_label}.
                                Personaliza ítems con el selector de la derecha.
                                Clic en un gráfico para ampliarlo.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {templates.map((template) => (
                                <button
                                    key={template.value}
                                    type="button"
                                    onClick={() =>
                                        visit({ template: template.value })
                                    }
                                    className={cn(
                                        'cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold',
                                        filters.template === template.value
                                            ? 'bg-[#1a2b4c] text-white'
                                            : 'border border-[#c5d5e6] text-[#1a2b4c]',
                                    )}
                                >
                                    {template.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-end gap-3">
                        <div className="w-full sm:w-auto">
                            <p className="mb-1 text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                                Fecha
                            </p>
                            <DateRangeFilter
                                desde={filters.date_from}
                                hasta={filters.date_to}
                                align="start"
                                onApply={(dateFrom, dateTo) =>
                                    visit({
                                        date_from: dateFrom,
                                        date_to: dateTo,
                                    })
                                }
                                onClear={() =>
                                    visit({ date_from: null, date_to: null })
                                }
                            />
                        </div>
                        <label className="w-full text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase sm:w-56">
                            Inspector
                            <select
                                value={filters.inspector_id ?? ''}
                                onChange={(event) =>
                                    visit({
                                        inspector_id:
                                            event.target.value === ''
                                                ? null
                                                : Number(event.target.value),
                                    })
                                }
                                className={selectClass}
                            >
                                <option value="">Todos</option>
                                {inspectors.map((inspector) => (
                                    <option
                                        key={inspector.id}
                                        value={inspector.id}
                                    >
                                        {inspector.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="w-full text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase sm:w-64">
                            Coordinador
                            <select
                                value={filters.coordinator_id ?? ''}
                                onChange={(event) =>
                                    visit({
                                        coordinator_id:
                                            event.target.value === ''
                                                ? null
                                                : Number(event.target.value),
                                    })
                                }
                                disabled={scoped}
                                className={cn(
                                    selectClass,
                                    'disabled:cursor-not-allowed disabled:opacity-60',
                                )}
                            >
                                {scoped ? null : <option value="">Todos</option>}
                                {coordinators.map((coordinator) => (
                                    <option
                                        key={coordinator.id}
                                        value={coordinator.id}
                                    >
                                        {coordinator.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div>
                            <p className="mb-1 text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                                Inspección
                            </p>
                            <div className="flex gap-1">
                                {(
                                    [
                                        ['actual', 'Actual'],
                                        ['first', '1ra'],
                                        ['second', '2da'],
                                    ] as const
                                ).map(([value, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() =>
                                            visit({ inspection: value })
                                        }
                                        className={cn(
                                            'h-10 cursor-pointer rounded-lg px-3 text-xs font-semibold',
                                            filters.inspection === value
                                                ? 'bg-[#1a2b4c] text-white'
                                                : 'border border-[#c5d5e6] text-[#1a2b4c]',
                                        )}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <label className="w-full text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase sm:w-56">
                            Tipo de vehículo
                            <select
                                value={selectedVehicle}
                                onChange={(event) =>
                                    visit({
                                        vehicle_types:
                                            event.target.value === ''
                                                ? []
                                                : [event.target.value],
                                    })
                                }
                                className={selectClass}
                            >
                                <option value="">Todos</option>
                                {vehicleOptions.map((type) => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <SstBoardItemPicker
                            template={filters.template}
                            items={items}
                            onChange={handleVisibleItemsChange}
                        />
                    </div>
                </div>

                {items.length === 0 ? (
                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-8 text-center text-sm text-[#5a7390] shadow-sm">
                        Esta plantilla no tiene requisitos para graficar.
                    </section>
                ) : displayedItems.length === 0 ? (
                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-8 text-center text-sm text-[#5a7390] shadow-sm">
                        No hay ítems seleccionados. Abre{' '}
                        <strong>Ítems a mostrar</strong> y marca al menos uno.
                    </section>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                        {displayedItems.map((item) => (
                            <RingCard
                                key={item.key}
                                ring={item}
                                onClick={() => setZoomRing(item)}
                            />
                        ))}
                    </div>
                )}

                {zoomRing ? (
                    <RingZoomLightbox
                        ring={zoomRing}
                        onClose={() => setZoomRing(null)}
                        onViewDetail={() => openItemDetail(zoomRing)}
                    />
                ) : null}
            </div>
        </>
    );
}

function RingZoomLightbox({
    ring,
    onClose,
    onViewDetail,
}: {
    ring: Ring;
    onClose: () => void;
    onViewDetail: () => void;
}) {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [onClose]);

    return createPortal(
        <div className="fixed inset-0 z-[100]">
            <button
                type="button"
                className="absolute inset-0 z-0 cursor-zoom-out bg-[#0a1220]/40 backdrop-blur-[2px] transition-opacity"
                aria-label="Cerrar vista ampliada"
                onClick={onClose}
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[1]"
                style={{
                    background:
                        'radial-gradient(ellipse 72% 68% at 50% 46%, rgba(10,18,32,0.05) 0%, rgba(10,18,32,0.45) 52%, rgba(10,18,32,0.92) 100%)',
                }}
            />
            <div
                className="pointer-events-none relative z-10 flex min-h-full items-center justify-center p-4 sm:p-8"
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="sst-ring-zoom-title"
                    className="pointer-events-auto w-full max-w-[24rem] animate-in fade-in zoom-in-95 duration-300"
                    onClick={(event) => event.stopPropagation()}
                >
                    <div
                        className="relative overflow-hidden rounded-3xl border border-white/50 bg-gradient-to-b from-white/92 via-white/88 to-white/80 p-5 shadow-[0_24px_80px_-12px_rgba(26,43,76,0.45)] backdrop-blur-xl sm:p-6"
                        style={{
                            boxShadow:
                                '0 0 0 1px rgba(255,255,255,0.35) inset, 0 28px 90px -20px rgba(15,23,42,0.55)',
                        }}
                    >
                        <button
                            type="button"
                            onClick={onClose}
                            className="absolute top-3 right-3 z-10 flex size-8 cursor-pointer items-center justify-center rounded-full border border-[#d7e3f0]/80 bg-white/80 text-[#1a2b4c] shadow-sm transition hover:bg-white"
                            aria-label="Cerrar"
                        >
                            <X className="size-4" />
                        </button>

                        <p
                            id="sst-ring-zoom-title"
                            className="pr-8 text-center text-[11px] font-bold tracking-[0.12em] text-[#6b8ead] uppercase"
                        >
                            Detalle
                        </p>
                        <h2 className="mt-1 text-center text-sm leading-snug font-bold text-[#1a2b4c] uppercase sm:text-base">
                            {ring.label}
                        </h2>
                        <div className="mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-[#1a2b4c]/25 to-transparent" />

                        <RingDonut ring={ring} size="xl" />

                        <div className="mt-5 grid grid-cols-3 gap-2">
                            <ZoomStat
                                label="OK"
                                value={ring.ok}
                                tone="ok"
                            />
                            <ZoomStat
                                label="Baja"
                                value={ring.baja}
                                tone="baja"
                            />
                            <ZoomStat
                                label="Falta"
                                value={ring.falta}
                                tone="falta"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={onViewDetail}
                            className="mt-5 w-full cursor-pointer rounded-xl bg-[#1a2b4c] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#243a5e]"
                        >
                            Ver detalle por semana
                        </button>

                        <p className="mt-3 text-center text-[10px] text-[#6b8ead]">
                            Clic fuera o Esc para cerrar
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}

function ZoomStat({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'ok' | 'baja' | 'falta';
}) {
    const styles = {
        ok: 'border-[#bbf7d0]/80 bg-[#f0fdf4]/90 text-[#166534]',
        baja: 'border-[#e2e8f0] bg-[#f8fafc]/90 text-[#64748b]',
        falta: 'border-[#fecaca]/80 bg-[#fef2f2]/90 text-[#b91c1c]',
    }[tone];

    return (
        <div
            className={cn(
                'rounded-xl border px-2 py-2.5 text-center backdrop-blur-sm',
                styles,
            )}
        >
            <p className="text-[9px] font-semibold tracking-wide uppercase opacity-80">
                {label}
            </p>
            <p className="text-xl font-bold tabular-nums">{value}</p>
        </div>
    );
}

function RingCard({
    ring,
    onClick,
}: {
    ring: Ring;
    onClick?: () => void;
}) {
    const Wrapper = onClick ? 'button' : 'article';

    return (
        <Wrapper
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            title={onClick ? 'Clic para ampliar' : undefined}
            className={cn(
                'flex w-full flex-col rounded-xl border border-[#d7e3f0] bg-white p-2 text-left shadow-sm transition',
                onClick &&
                    'cursor-pointer hover:border-[#1a2b4c]/30 hover:shadow-md active:scale-[0.98]',
            )}
        >
            <h2 className="line-clamp-2 min-h-8 text-center text-[10px] leading-tight font-bold tracking-wide text-[#1a2b4c] uppercase">
                {ring.label}
            </h2>
            <RingDonut ring={ring} size="sm" />
            <div className="mt-1.5 grid grid-cols-3 gap-1 border-t border-[#e8eef5] pt-1.5 text-center">
                <Count
                    label="OK"
                    value={ring.ok}
                    className="text-[#166534]"
                    compact
                />
                <Count
                    label="Baja"
                    value={ring.baja}
                    className="text-[#64748b]"
                    compact
                />
                <Count
                    label="Falta"
                    value={ring.falta}
                    className="text-[#b91c1c]"
                    compact
                />
            </div>
        </Wrapper>
    );
}

function RingDonut({
    ring,
    size,
}: {
    ring: Ring;
    size: 'sm' | 'lg' | 'xl';
}) {
    const radius = size === 'xl' ? 54 : size === 'lg' ? 52 : 34;
    const stroke = size === 'xl' ? 13 : size === 'lg' ? 14 : 9;
    const circumference = 2 * Math.PI * radius;
    const parts = [
        { key: 'ok', value: ring.ok, color: OK },
        { key: 'baja', value: ring.baja, color: BAJA },
        { key: 'falta', value: ring.falta, color: FALTA },
    ].filter((part) => part.value > 0);

    let offset = 0;
    const arcs =
        ring.total === 0
            ? []
            : parts.map((part) => {
                  const length = (part.value / ring.total) * circumference;
                  const arc = {
                      ...part,
                      dash: length,
                      gap: circumference - length,
                      offset,
                  };
                  offset += length;

                  return arc;
              });

    return (
        <div
            className={cn(
                'relative mx-auto',
                size === 'xl'
                    ? 'size-52'
                    : size === 'lg'
                      ? 'mt-2 size-44'
                      : 'mt-1 size-[4.75rem]',
            )}
        >
            <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke="#e8eef5"
                    strokeWidth={stroke}
                />
                {arcs.map((arc) => (
                    <circle
                        key={arc.key}
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="none"
                        stroke={arc.color}
                        strokeWidth={stroke}
                        strokeDasharray={`${arc.dash} ${arc.gap}`}
                        strokeDashoffset={-arc.offset}
                    />
                ))}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
                <span
                    className={cn(
                        'font-bold text-[#1a2b4c]',
                        size === 'xl'
                            ? 'text-4xl'
                            : size === 'lg'
                              ? 'text-3xl'
                              : 'text-sm',
                    )}
                >
                    {ring.total === 0 ? '—' : `${ring.percent}%`}
                </span>
            </div>
        </div>
    );
}

function Count({
    label,
    value,
    className,
    compact = false,
}: {
    label: string;
    value: number;
    className: string;
    compact?: boolean;
}) {
    return (
        <div>
            <p
                className={cn(
                    'font-semibold tracking-wide text-[#6b8ead] uppercase',
                    compact ? 'text-[9px]' : 'text-[10px]',
                )}
            >
                {label}
            </p>
            <p
                className={cn(
                    'font-bold',
                    compact ? 'text-sm' : 'text-lg',
                    className,
                )}
            >
                {value}
            </p>
        </div>
    );
}

SstBoardPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Reportes', href: '#' },
        { title: 'Tablero SST', href: '/tablero-sst' },
    ],
};
