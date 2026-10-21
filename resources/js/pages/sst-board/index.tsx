import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { dashboard } from '@/routes';
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
            {
                date_from: merged.date_from || undefined,
                date_to: merged.date_to || undefined,
                ...(!merged.date_from && !merged.date_to
                    ? { all_dates: 1 }
                    : {}),
                coordinator_id: merged.coordinator_id ?? undefined,
                inspector_id: merged.inspector_id ?? undefined,
                vehicle_types:
                    merged.vehicle_types.length > 0
                        ? merged.vehicle_types
                        : undefined,
                template: merged.template,
                inspection: merged.inspection,
            },
            { preserveState: true, preserveScroll: true, replace: true },
        );
    };

    const [zoomRing, setZoomRing] = useState<Ring | null>(null);

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
                                Clic en un gráfico para ampliarlo. Verde OK,
                                gris sin marcar, rojo en NO.
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
                    </div>
                </div>

                {items.length === 0 ? (
                    <section className="rounded-2xl border border-[#d7e3f0] bg-white p-8 text-center text-sm text-[#5a7390] shadow-sm">
                        Esta plantilla no tiene requisitos para graficar.
                    </section>
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
                        {items.map((item) => (
                            <RingCard
                                key={item.key}
                                ring={item}
                                onClick={() => setZoomRing(item)}
                            />
                        ))}
                    </div>
                )}

                <Dialog
                    open={zoomRing !== null}
                    onOpenChange={(open) => {
                        if (!open) {
                            setZoomRing(null);
                        }
                    }}
                >
                    <DialogContent className="max-w-md border-[#d7e3f0] bg-white">
                        {zoomRing ? (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="text-center text-sm font-bold tracking-wide text-[#1a2b4c] uppercase">
                                        {zoomRing.label}
                                    </DialogTitle>
                                </DialogHeader>
                                <RingCard ring={zoomRing} zoom />
                            </>
                        ) : null}
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}

function RingCard({
    ring,
    zoom = false,
    onClick,
}: {
    ring: Ring;
    zoom?: boolean;
    onClick?: () => void;
}) {
    const Wrapper = onClick ? 'button' : 'article';

    return (
        <Wrapper
            type={onClick ? 'button' : undefined}
            onClick={onClick}
            title={onClick ? 'Clic para ampliar' : undefined}
            className={cn(
                'flex w-full flex-col rounded-xl border border-[#d7e3f0] bg-white text-left shadow-sm transition',
                zoom ? 'border-0 p-2 shadow-none' : 'p-2 hover:border-[#1a2b4c]/30 hover:shadow-md',
                onClick && 'cursor-pointer',
            )}
        >
            {!zoom ? (
                <h2 className="line-clamp-2 min-h-8 text-center text-[10px] leading-tight font-bold tracking-wide text-[#1a2b4c] uppercase">
                    {ring.label}
                </h2>
            ) : null}
            <RingDonut ring={ring} size={zoom ? 'lg' : 'sm'} />
            <div
                className={cn(
                    'grid grid-cols-3 gap-1 border-t border-[#e8eef5] text-center',
                    zoom ? 'mt-4 pt-4' : 'mt-1.5 pt-1.5',
                )}
            >
                <Count
                    label="OK"
                    value={ring.ok}
                    className="text-[#166534]"
                    compact={!zoom}
                />
                <Count
                    label="Baja"
                    value={ring.baja}
                    className="text-[#64748b]"
                    compact={!zoom}
                />
                <Count
                    label="Falta"
                    value={ring.falta}
                    className="text-[#b91c1c]"
                    compact={!zoom}
                />
            </div>
        </Wrapper>
    );
}

function RingDonut({ ring, size }: { ring: Ring; size: 'sm' | 'lg' }) {
    const radius = size === 'lg' ? 52 : 34;
    const stroke = size === 'lg' ? 14 : 9;
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
                size === 'lg' ? 'mt-2 size-44' : 'mt-1 size-[4.75rem]',
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
                        size === 'lg' ? 'text-3xl' : 'text-sm',
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
