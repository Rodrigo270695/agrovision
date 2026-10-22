import { Head, router, usePage } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';
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
                                onClick={() => openItemDetail(item)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
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
            title={onClick ? 'Ver detalle por semana' : undefined}
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
