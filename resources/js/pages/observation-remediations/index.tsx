import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ClipboardCheck,
    ImagePlus,
    MapPin,
    ShieldAlert,
    Sparkles,
    UserRound,
    X,
    XCircle,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type DayCell = {
    date: string;
    tone: 'none' | 'green' | 'amber' | 'red' | 'mixed';
    amber: number;
    red: number;
    green: number;
    label: string | null;
};

type ObservationItem = {
    id: number;
    checklist_item_id: number;
    label: string;
    item_number?: string | number | null;
    value: string | null;
    observations: string | null;
    photos?: { id: number; url: string | null }[];
};

type DayUnit = {
    checklist_id: number;
    pass: 'first' | 'second';
    pass_label: string;
    tone: 'amber' | 'red' | 'green';
    grade: string;
    grade_label: string;
    percent: number;
    plate_number: string;
    driver_name?: string | null;
    sede?: string | null;
    garita?: string | null;
    inspector?: string | null;
    template?: string | null;
    remediation: {
        id: number | null;
        status: string;
        status_label: string;
        submit_note?: string | null;
        rejection_note?: string | null;
    };
    observations: ObservationItem[];
    can_submit: boolean;
    can_verify: boolean;
};

type PageProps = {
    calendar: {
        year: number;
        month: number;
        days: DayCell[];
    };
    selected_date: string | null;
    day_units: DayUnit[];
    can_submit: boolean;
    can_verify: boolean;
};

const MONTHS = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
];

const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

function visit(params: {
    year: number;
    month: number;
    date?: string | null;
}) {
    const query: Record<string, string> = {
        year: String(params.year),
        month: String(params.month),
    };

    if (params.date) {
        query.date = params.date;
    }

    router.get('/calendario-observaciones', query, {
        preserveState: true,
        preserveScroll: true,
        replace: true,
    });
}

function padGrid(year: number, month: number, days: DayCell[]) {
    const first = new Date(year, month - 1, 1);
    const mondayIndex = (first.getDay() + 6) % 7;
    const cells: Array<{
        key: string;
        inMonth: boolean;
        day: number;
        cell: DayCell | null;
    }> = [];

    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevLast = new Date(prevYear, prevMonth, 0).getDate();

    for (let i = mondayIndex - 1; i >= 0; i--) {
        const day = prevLast - i;
        cells.push({
            key: `p-${day}`,
            inMonth: false,
            day,
            cell: null,
        });
    }

    for (const d of days) {
        cells.push({
            key: d.date,
            inMonth: true,
            day: Number(d.date.slice(-2)),
            cell: d,
        });
    }

    let nextDay = 1;
    while (cells.length % 7 !== 0) {
        cells.push({
            key: `n-${nextDay}`,
            inMonth: false,
            day: nextDay,
            cell: null,
        });
        nextDay += 1;
    }

    return cells;
}

function formatDateLabel(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function actionLabel(unit: DayUnit) {
    if (unit.tone === 'green') {
        return 'Ver';
    }
    if (unit.tone === 'red') {
        return 'Ver detalle';
    }
    if (unit.can_verify) {
        return 'Verificar';
    }
    if (unit.can_submit) {
        return 'Levantar';
    }
    return 'Ver paquete';
}

export default function ObservationRemediationsPage() {
    const { calendar, selected_date, day_units, can_submit, can_verify } =
        usePage<PageProps>().props;

    const [detail, setDetail] = useState<DayUnit | null>(null);

    const todayIso = useMemo(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }, []);

    const grid = useMemo(
        () => padGrid(calendar.year, calendar.month, calendar.days),
        [calendar],
    );

    const monthStats = useMemo(() => {
        let amber = 0;
        let red = 0;
        let green = 0;
        let activeDays = 0;
        for (const day of calendar.days) {
            amber += day.amber;
            red += day.red;
            green += day.green;
            if (day.tone !== 'none') {
                activeDays += 1;
            }
        }
        return { amber, red, green, activeDays };
    }, [calendar.days]);

    const daySummary = useMemo(() => {
        const amber = day_units.filter((u) => u.tone === 'amber').length;
        const red = day_units.filter((u) => u.tone === 'red').length;
        const green = day_units.filter((u) => u.tone === 'green').length;
        return { amber, red, green };
    }, [day_units]);

    const shiftMonth = (delta: number) => {
        let month = calendar.month + delta;
        let year = calendar.year;
        if (month < 1) {
            month = 12;
            year -= 1;
        } else if (month > 12) {
            month = 1;
            year += 1;
        }
        visit({ year, month });
    };

    const goToday = () => {
        const now = new Date();
        visit({
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            date: todayIso,
        });
    };

    const years = useMemo(
        () => [calendar.year - 1, calendar.year, calendar.year + 1],
        [calendar.year],
    );

    return (
        <>
            <Head title="Calendario de observaciones" />

            <div className="relative min-h-full w-full overflow-hidden">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(30,77,140,0.12),_transparent_55%),radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.10),_transparent_45%),linear-gradient(180deg,#f4f7fb_0%,#eef3f8_48%,#f8fafc_100%)]"
                />
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] opacity-60"
                />

                <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col gap-5 p-4 sm:gap-6 sm:p-6">
                    {/* Hero */}
                    <header className="overflow-hidden rounded-3xl border border-white/70 bg-[#0f1f3a] text-white shadow-[0_24px_60px_-28px_rgba(15,31,58,0.65)]">
                        <div className="relative px-5 py-6 sm:px-7 sm:py-7">
                            <div
                                aria-hidden
                                className="absolute -right-16 -top-20 size-56 rounded-full bg-amber-400/20 blur-3xl"
                            />
                            <div
                                aria-hidden
                                className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-sky-400/15 blur-3xl"
                            />

                            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                <div className="max-w-2xl">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-sky-100 uppercase backdrop-blur-sm">
                                        <Sparkles
                                            className="size-3.5"
                                            aria-hidden
                                        />
                                        Operaciones · Campo
                                    </div>
                                    <h1 className="mt-3 font-[Manrope] text-3xl font-bold tracking-tight sm:text-4xl">
                                        Calendario de observaciones
                                    </h1>
                                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-sky-100/85 sm:text-[15px]">
                                        Un vistazo al mes: qué días están OK,
                                        cuáles llevan observaciones por levantar
                                        y dónde hubo desaprobaciones. Toca un
                                        día y actúa.
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[420px]">
                                    <StatPill
                                        label="Días activos"
                                        value={monthStats.activeDays}
                                        tone="navy"
                                    />
                                    <StatPill
                                        label="Con obs."
                                        value={monthStats.amber}
                                        tone="amber"
                                    />
                                    <StatPill
                                        label="Desaprob."
                                        value={monthStats.red}
                                        tone="rose"
                                    />
                                    <StatPill
                                        label="OK"
                                        value={monthStats.green}
                                        tone="emerald"
                                    />
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Toolbar */}
                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <NavIconButton
                                label="Mes anterior"
                                onClick={() => shiftMonth(-1)}
                            >
                                <ChevronLeft className="size-4" />
                            </NavIconButton>
                            <Button
                                type="button"
                                onClick={goToday}
                                className="cursor-pointer rounded-xl bg-[#1e4d8c] px-4 text-white hover:bg-[#163a6b]"
                            >
                                <CalendarDays className="mr-1.5 size-4" />
                                Hoy
                            </Button>
                            <NavIconButton
                                label="Mes siguiente"
                                onClick={() => shiftMonth(1)}
                            >
                                <ChevronRight className="size-4" />
                            </NavIconButton>

                            <select
                                aria-label="Mes"
                                className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]/20"
                                value={calendar.month}
                                onChange={(e) =>
                                    visit({
                                        year: calendar.year,
                                        month: Number(e.target.value),
                                    })
                                }
                            >
                                {MONTHS.map((name, index) => (
                                    <option key={name} value={index + 1}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                            <select
                                aria-label="Año"
                                className="h-10 cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]/20"
                                value={calendar.year}
                                onChange={(e) =>
                                    visit({
                                        year: Number(e.target.value),
                                        month: calendar.month,
                                    })
                                }
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>
                                        {y}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-medium">
                            <LegendDot color="bg-emerald-500" label="OK" />
                            <LegendDot
                                color="bg-amber-500"
                                label="Con observaciones"
                            />
                            <LegendDot
                                color="bg-rose-500"
                                label="Desaprobadas"
                            />
                        </div>
                    </div>

                    {/* Calendar */}
                    <section className="rounded-3xl border border-slate-200/80 bg-white/95 p-3 shadow-[0_18px_50px_-30px_rgba(15,31,58,0.45)] sm:p-5">
                        <div className="mb-3 grid grid-cols-7 gap-1.5 sm:gap-2">
                            {WEEKDAYS.map((d) => (
                                <div
                                    key={d}
                                    className="px-1 text-center text-[10px] font-bold tracking-[0.16em] text-slate-400 uppercase sm:text-[11px]"
                                >
                                    {d}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                            {grid.map((slot, index) => {
                                const selected =
                                    slot.inMonth &&
                                    slot.cell?.date === selected_date;
                                const isToday =
                                    slot.inMonth &&
                                    slot.cell?.date === todayIso;
                                const tone = slot.cell?.tone ?? 'none';

                                return (
                                    <button
                                        key={slot.key}
                                        type="button"
                                        disabled={!slot.inMonth || !slot.cell}
                                        aria-pressed={Boolean(selected)}
                                        aria-label={
                                            slot.inMonth && slot.cell
                                                ? `${slot.day} de ${MONTHS[calendar.month - 1]}${slot.cell.label ? `: ${slot.cell.label}` : ''}`
                                                : undefined
                                        }
                                        onClick={() => {
                                            if (!slot.cell) {
                                                return;
                                            }
                                            visit({
                                                year: calendar.year,
                                                month: calendar.month,
                                                date: slot.cell.date,
                                            });
                                        }}
                                        style={{
                                            animationDelay: `${Math.min(index, 28) * 12}ms`,
                                        }}
                                        className={cn(
                                            'group relative min-h-[76px] overflow-hidden rounded-2xl border p-2 text-left transition duration-200 sm:min-h-[96px] sm:p-2.5',
                                            'motion-safe:animate-[fadeInUp_420ms_ease-out_both]',
                                            slot.inMonth
                                                ? cn(
                                                      'cursor-pointer focus-visible:ring-2 focus-visible:ring-[#1e4d8c] focus-visible:ring-offset-2 focus-visible:outline-none',
                                                      'hover:-translate-y-0.5 hover:shadow-md',
                                                      daySurface(tone, selected),
                                                  )
                                                : 'cursor-default border-transparent bg-transparent text-slate-300',
                                        )}
                                    >
                                        {slot.inMonth ? (
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'absolute inset-y-0 left-0 w-1 rounded-l-2xl',
                                                    toneBar(tone),
                                                )}
                                            />
                                        ) : null}

                                        <div className="flex items-start justify-between gap-1 pl-1">
                                            <span
                                                className={cn(
                                                    'inline-flex size-7 items-center justify-center rounded-full text-sm font-bold transition sm:size-8',
                                                    isToday
                                                        ? 'bg-[#1e4d8c] text-white shadow-sm'
                                                        : slot.inMonth
                                                          ? 'text-slate-800 group-hover:bg-white/70'
                                                          : 'text-slate-300',
                                                )}
                                            >
                                                {slot.day}
                                            </span>
                                            {slot.inMonth &&
                                            slot.cell &&
                                            (slot.cell.green > 0 ||
                                                slot.cell.amber > 0 ||
                                                slot.cell.red > 0) ? (
                                                <span className="mt-1 flex items-center gap-0.5">
                                                    {slot.cell.green > 0 ? (
                                                        <span
                                                            aria-hidden
                                                            className="size-1.5 rounded-full bg-emerald-500"
                                                        />
                                                    ) : null}
                                                    {slot.cell.amber > 0 ? (
                                                        <span
                                                            aria-hidden
                                                            className="size-1.5 rounded-full bg-amber-500"
                                                        />
                                                    ) : null}
                                                    {slot.cell.red > 0 ? (
                                                        <span
                                                            aria-hidden
                                                            className="size-1.5 rounded-full bg-rose-500"
                                                        />
                                                    ) : null}
                                                </span>
                                            ) : null}
                                        </div>

                                        {slot.inMonth && slot.cell ? (
                                            <DayCountChips cell={slot.cell} />
                                        ) : null}
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    {/* Day panel */}
                    {selected_date ? (
                        <section
                            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-[0_18px_50px_-30px_rgba(15,31,58,0.4)] motion-safe:animate-[fadeInUp_380ms_ease-out]"
                            aria-live="polite"
                        >
                            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 bg-[linear-gradient(135deg,#f8fbff,#ffffff_55%)] px-4 py-4 sm:px-6">
                                <div>
                                    <p className="text-[11px] font-semibold tracking-[0.14em] text-[#6b8ead] uppercase">
                                        Detalle del día
                                    </p>
                                    <h2 className="mt-1 font-[Manrope] text-xl font-bold capitalize tracking-tight text-[#0f1f3a]">
                                        {formatDateLabel(selected_date)}
                                    </h2>
                                    <p
                                        className="mt-1 text-sm text-slate-600"
                                        role="status"
                                        aria-atomic="true"
                                    >
                                        {day_units.length === 0
                                            ? 'Sin inspecciones registradas este día.'
                                            : `${day_units.length} unidad(es): ${daySummary.green} OK · ${daySummary.amber} obs. · ${daySummary.red} desap.`}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="cursor-pointer rounded-xl"
                                    onClick={() =>
                                        visit({
                                            year: calendar.year,
                                            month: calendar.month,
                                        })
                                    }
                                >
                                    <X className="mr-1 size-4" />
                                    Cerrar
                                </Button>
                            </div>

                            {day_units.length === 0 ? (
                                <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
                                    <div className="flex size-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                                        <CalendarDays className="size-7" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-[#0f1f3a]">
                                            Sin inspecciones este día
                                        </p>
                                        <p className="mt-1 max-w-sm text-sm text-slate-500">
                                            No hay unidades registradas para la
                                            fecha seleccionada.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <ul className="grid gap-3 p-4 sm:grid-cols-1 sm:p-5 lg:grid-cols-2">
                                    {day_units.map((unit, i) => (
                                        <li
                                            key={`${unit.checklist_id}-${unit.pass}`}
                                            style={{
                                                animationDelay: `${i * 40}ms`,
                                            }}
                                            className={cn(
                                                'group relative overflow-hidden rounded-2xl border bg-white p-4 transition duration-200',
                                                'hover:-translate-y-0.5 hover:shadow-md motion-safe:animate-[fadeInUp_360ms_ease-out_both]',
                                                unit.tone === 'red'
                                                    ? 'border-rose-200/80'
                                                    : unit.tone === 'green'
                                                      ? 'border-emerald-200/80'
                                                      : 'border-amber-200/80',
                                            )}
                                        >
                                            <span
                                                aria-hidden
                                                className={cn(
                                                    'absolute inset-y-0 left-0 w-1.5',
                                                    unit.tone === 'red'
                                                        ? 'bg-rose-500'
                                                        : unit.tone === 'green'
                                                          ? 'bg-emerald-500'
                                                          : 'bg-amber-500',
                                                )}
                                            />

                                            <div className="flex flex-col gap-3 pl-2 sm:flex-row sm:items-center sm:justify-between">
                                                <div className="min-w-0 space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="font-[Manrope] text-lg font-bold tracking-tight text-[#0f1f3a]">
                                                            {unit.plate_number}
                                                        </span>
                                                        <StatusBadge
                                                            tone={unit.tone}
                                                            label={
                                                                unit.grade_label
                                                            }
                                                        />
                                                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
                                                            {unit.pass_label}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">
                                                        <span className="inline-flex items-center gap-1">
                                                            <UserRound
                                                                className="size-3.5 text-slate-400"
                                                                aria-hidden
                                                            />
                                                            {unit.driver_name ||
                                                                'Sin conductor'}
                                                        </span>
                                                        {(unit.sede ||
                                                            unit.garita) && (
                                                            <span className="inline-flex items-center gap-1">
                                                                <MapPin
                                                                    className="size-3.5 text-slate-400"
                                                                    aria-hidden
                                                                />
                                                                {[
                                                                    unit.sede,
                                                                    unit.garita,
                                                                ]
                                                                    .filter(
                                                                        Boolean,
                                                                    )
                                                                    .join(
                                                                        ' · ',
                                                                    )}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <p className="text-xs text-slate-500">
                                                        Inspector:{' '}
                                                        <span className="font-medium text-slate-700">
                                                            {unit.inspector ||
                                                                '—'}
                                                        </span>
                                                        <span className="mx-1.5 text-slate-300">
                                                            ·
                                                        </span>
                                                        {unit.remediation
                                                            .status_label}
                                                    </p>
                                                </div>

                                                <Button
                                                    type="button"
                                                    className={cn(
                                                        'cursor-pointer shrink-0 rounded-xl',
                                                        unit.tone === 'red'
                                                            ? 'border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                                                            : unit.tone ===
                                                                'green'
                                                              ? 'border-emerald-200 bg-white text-emerald-800 hover:bg-emerald-50'
                                                              : unit.can_verify
                                                                ? 'bg-[#1e4d8c] text-white hover:bg-[#163a6b]'
                                                                : 'bg-amber-500 text-white hover:bg-amber-600',
                                                    )}
                                                    variant={
                                                        unit.tone === 'red' ||
                                                        unit.tone === 'green'
                                                            ? 'outline'
                                                            : 'default'
                                                    }
                                                    onClick={() =>
                                                        setDetail(unit)
                                                    }
                                                >
                                                    {unit.tone === 'amber' &&
                                                    unit.can_submit ? (
                                                        <ClipboardCheck className="mr-1.5 size-4" />
                                                    ) : null}
                                                    {unit.can_verify ? (
                                                        <CheckCircle2 className="mr-1.5 size-4" />
                                                    ) : null}
                                                    {unit.tone === 'green' ? (
                                                        <CheckCircle2 className="mr-1.5 size-4" />
                                                    ) : null}
                                                    {actionLabel(unit)}
                                                </Button>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center text-sm text-slate-500">
                            Selecciona un día del calendario para ver las
                            unidades.
                        </div>
                    )}
                </div>
            </div>

            {detail ? (
                <RemediationDetailModal
                    unit={detail}
                    canSubmit={can_submit}
                    canVerify={can_verify}
                    onClose={() => setDetail(null)}
                />
            ) : null}

            <style>{`
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @media (prefers-reduced-motion: reduce) {
                    .motion-safe\\:animate-\\[fadeInUp_420ms_ease-out_both\\],
                    .motion-safe\\:animate-\\[fadeInUp_380ms_ease-out\\],
                    .motion-safe\\:animate-\\[fadeInUp_360ms_ease-out_both\\] {
                        animation: none !important;
                    }
                }
            `}</style>
        </>
    );
}

function StatPill({
    label,
    value,
    tone,
}: {
    label: string;
    value: number;
    tone: 'navy' | 'amber' | 'rose' | 'emerald';
}) {
    const tones = {
        navy: 'from-white/15 to-white/5 text-white',
        amber: 'from-amber-400/25 to-amber-500/10 text-amber-50',
        rose: 'from-rose-400/25 to-rose-500/10 text-rose-50',
        emerald: 'from-emerald-400/25 to-emerald-500/10 text-emerald-50',
    };

    return (
        <div
            className={cn(
                'rounded-2xl border border-white/10 bg-gradient-to-br px-3 py-2.5 backdrop-blur-sm',
                tones[tone],
            )}
        >
            <p className="text-[10px] font-semibold tracking-wide text-white/70 uppercase">
                {label}
            </p>
            <p className="mt-0.5 font-[Manrope] text-2xl font-bold tabular-nums">
                {value}
            </p>
        </div>
    );
}

function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200/80">
            <span className={cn('size-2.5 rounded-full', color)} />
            {label}
        </span>
    );
}

function NavIconButton({
    label,
    onClick,
    children,
}: {
    label: string;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={label}
            onClick={onClick}
            className="cursor-pointer rounded-xl"
        >
            {children}
        </Button>
    );
}

function StatusBadge({
    tone,
    label,
}: {
    tone: 'amber' | 'red' | 'green';
    label: string;
}) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                tone === 'red'
                    ? 'bg-rose-100 text-rose-800'
                    : tone === 'green'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900',
            )}
        >
            {tone === 'red' ? (
                <AlertTriangle className="size-3" aria-hidden />
            ) : tone === 'green' ? (
                <CheckCircle2 className="size-3" aria-hidden />
            ) : (
                <ClipboardCheck className="size-3" aria-hidden />
            )}
            {label}
        </span>
    );
}

function DayCountChips({ cell }: { cell: DayCell }) {
    const chips: { key: string; count: number; className: string; text: string }[] =
        [];

    if (cell.green > 0) {
        chips.push({
            key: 'g',
            count: cell.green,
            className: 'bg-emerald-100 text-emerald-900',
            text: `${cell.green} OK`,
        });
    }
    if (cell.amber > 0) {
        chips.push({
            key: 'a',
            count: cell.amber,
            className: 'bg-amber-100 text-amber-950',
            text: `${cell.amber} obs.`,
        });
    }
    if (cell.red > 0) {
        chips.push({
            key: 'r',
            count: cell.red,
            className: 'bg-rose-100 text-rose-950',
            text: `${cell.red} desap.`,
        });
    }

    if (chips.length === 0) {
        return (
            <div className="mt-3 hidden text-[10px] text-slate-400 sm:block">
                —
            </div>
        );
    }

    return (
        <div className="mt-2 flex flex-col gap-0.5 sm:mt-3">
            {chips.map((chip) => (
                <div
                    key={chip.key}
                    className={cn(
                        'truncate rounded-md px-1.5 py-0.5 text-[9px] font-semibold leading-tight sm:text-[10px]',
                        chip.className,
                    )}
                >
                    {chip.text}
                </div>
            ))}
        </div>
    );
}

function daySurface(tone: DayCell['tone'], selected: boolean) {
    if (selected) {
        return 'border-[#1e4d8c] bg-[#e8f1fb] shadow-md ring-2 ring-[#1e4d8c]/20';
    }
    switch (tone) {
        case 'green':
            return 'border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white';
        case 'amber':
            return 'border-amber-200/90 bg-gradient-to-br from-amber-50 to-white';
        case 'red':
            return 'border-rose-200/90 bg-gradient-to-br from-rose-50 to-white';
        case 'mixed':
            return 'border-slate-200 bg-gradient-to-br from-slate-50 via-white to-amber-50/40';
        default:
            return 'border-slate-200 bg-white';
    }
}

function toneBar(tone: DayCell['tone']) {
    switch (tone) {
        case 'green':
            return 'bg-emerald-500';
        case 'amber':
            return 'bg-amber-500';
        case 'red':
            return 'bg-rose-500';
        case 'mixed':
            return 'bg-gradient-to-b from-emerald-500 via-amber-500 to-rose-500';
        default:
            return 'bg-slate-200';
    }
}

function RemediationDetailModal({
    unit,
    canSubmit,
    canVerify,
    onClose,
}: {
    unit: DayUnit;
    canSubmit: boolean;
    canVerify: boolean;
    onClose: () => void;
}) {
    const [itemPhotos, setItemPhotos] = useState<Record<number, File | null>>(
        {},
    );
    const [submitNote, setSubmitNote] = useState('');
    const [sending, setSending] = useState(false);
    const [checkedIds, setCheckedIds] = useState<Record<number, boolean>>({});
    const [itemNotes, setItemNotes] = useState<Record<number, string>>({});

    const verifyForm = useForm<{
        pass: string;
        decision: 'approve' | 'reject';
        note: string;
        checked_ids: number[];
        item_notes: Record<number, string>;
    }>({
        pass: unit.pass,
        decision: 'approve',
        note: '',
        checked_ids: [],
        item_notes: {},
    });

    const showSubmit = canSubmit && unit.can_submit;
    const showVerify = canVerify && unit.can_verify;
    const isRed = unit.tone === 'red';
    const noItems = unit.observations;
    const allChecked =
        noItems.length === 0 ||
        noItems.every((item) => checkedIds[item.id] === true);

    const sendToInspector = () => {
        const data = new FormData();
        data.append('pass', unit.pass);
        if (submitNote.trim() !== '') {
            data.append('note', submitNote.trim());
        }

        for (const [answerId, file] of Object.entries(itemPhotos)) {
            if (file) {
                data.append(`photos[${answerId}]`, file);
            }
        }

        router.post(
            `/calendario-observaciones/${unit.checklist_id}/enviar`,
            data,
            {
                forceFormData: true,
                preserveScroll: true,
                onStart: () => setSending(true),
                onFinish: () => setSending(false),
                onSuccess: () => onClose(),
            },
        );
    };

    return (
        <AppModal
            open
            onClose={onClose}
            title={`${unit.plate_number} · ${unit.pass_label}`}
            description={`${unit.grade_label} · ${unit.remediation.status_label}`}
            className="max-w-2xl"
            footer={
                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer rounded-xl"
                        onClick={onClose}
                    >
                        Cerrar
                    </Button>
                    {showSubmit ? (
                        <Button
                            type="button"
                            className="cursor-pointer rounded-xl bg-amber-500 text-white hover:bg-amber-600"
                            disabled={sending}
                            onClick={sendToInspector}
                        >
                            {sending ? 'Enviando…' : 'Enviar al inspector'}
                        </Button>
                    ) : null}
                    {showVerify ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer rounded-xl text-rose-700"
                                disabled={verifyForm.processing}
                                onClick={() => {
                                    verifyForm
                                        .transform((data) => ({
                                            ...data,
                                            decision: 'reject' as const,
                                            checked_ids: [],
                                            item_notes: itemNotes,
                                        }))
                                        .post(
                                            `/calendario-observaciones/${unit.checklist_id}/verificar`,
                                            {
                                                preserveScroll: true,
                                                onSuccess: () => onClose(),
                                                onFinish: () =>
                                                    verifyForm.transform(
                                                        (data) => data,
                                                    ),
                                            },
                                        );
                                }}
                            >
                                Rechazar
                            </Button>
                            <Button
                                type="button"
                                className="cursor-pointer rounded-xl bg-[#1e4d8c] text-white hover:bg-[#163a6b]"
                                disabled={
                                    verifyForm.processing || !allChecked
                                }
                                title={
                                    allChecked
                                        ? undefined
                                        : 'Marca el check de todos los ítems NO'
                                }
                                onClick={() => {
                                    verifyForm
                                        .transform((data) => ({
                                            ...data,
                                            decision: 'approve' as const,
                                            checked_ids: noItems
                                                .filter(
                                                    (item) =>
                                                        checkedIds[item.id],
                                                )
                                                .map((item) => item.id),
                                            item_notes: itemNotes,
                                        }))
                                        .post(
                                            `/calendario-observaciones/${unit.checklist_id}/verificar`,
                                            {
                                                preserveScroll: true,
                                                onSuccess: () => onClose(),
                                                onFinish: () =>
                                                    verifyForm.transform(
                                                        (data) => data,
                                                    ),
                                            },
                                        );
                                }}
                            >
                                {verifyForm.processing
                                    ? 'Guardando…'
                                    : 'Aprobar levantamiento'}
                            </Button>
                        </>
                    ) : null}
                </div>
            }
        >
            <div className="space-y-4">
                <div className="grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-100 sm:grid-cols-2">
                    <p>
                        <span className="font-semibold text-slate-800">
                            Conductor:
                        </span>{' '}
                        {unit.driver_name || '—'}
                    </p>
                    <p>
                        <span className="font-semibold text-slate-800">
                            Inspector:
                        </span>{' '}
                        {unit.inspector || '—'}
                    </p>
                    <p>
                        <span className="font-semibold text-slate-800">
                            Sede:
                        </span>{' '}
                        {unit.sede || '—'}
                    </p>
                    <p>
                        <span className="font-semibold text-slate-800">
                            Garita:
                        </span>{' '}
                        {unit.garita || '—'}
                    </p>
                </div>

                {isRed ? (
                    <div className="flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-900">
                        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                        <p>
                            Desaprobada: aquí solo consultas el detalle. El
                            levantamiento con evidencia aplica a aprobadas con
                            observaciones.
                        </p>
                    </div>
                ) : null}

                <div>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold text-[#0f1f3a]">
                        <XCircle className="size-4 text-rose-600" />
                        Ítems en NO ({noItems.length})
                    </h3>
                    {noItems.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
                            No hay ítems en NO. Puede ser un aprobado con
                            observaciones por umbral Pareto sin respuestas NO.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {noItems.map((item) => {
                                const pendingFile = itemPhotos[item.id] ?? null;
                                const savedPhotos = item.photos ?? [];
                                const isChecked = checkedIds[item.id] === true;

                                return (
                                    <li
                                        key={`${item.id}-${item.checklist_item_id}`}
                                        className={cn(
                                            'rounded-xl border px-3 py-2.5 shadow-sm',
                                            showVerify && isChecked
                                                ? 'border-emerald-200 bg-emerald-50/40'
                                                : 'border-rose-200/80 bg-rose-50/30',
                                        )}
                                    >
                                        <div className="flex items-start gap-2">
                                            {showVerify ? (
                                                <label className="mt-0.5 flex cursor-pointer items-center">
                                                    <input
                                                        type="checkbox"
                                                        className="size-4 cursor-pointer rounded border-slate-300 accent-emerald-600"
                                                        checked={isChecked}
                                                        onChange={(e) =>
                                                            setCheckedIds(
                                                                (prev) => ({
                                                                    ...prev,
                                                                    [item.id]:
                                                                        e.target
                                                                            .checked,
                                                                }),
                                                            )
                                                        }
                                                        aria-label={`Marcar como subsanado: ${item.label}`}
                                                    />
                                                </label>
                                            ) : (
                                                <XCircle className="mt-0.5 size-4 shrink-0 text-rose-600" />
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {item.item_number
                                                        ? `${item.item_number}. `
                                                        : ''}
                                                    {item.label}
                                                    <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                                                        NO
                                                    </span>
                                                    {showVerify &&
                                                    isChecked ? (
                                                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                                            Subsanado
                                                        </span>
                                                    ) : null}
                                                </p>
                                                {item.observations ? (
                                                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                                                        {item.observations}
                                                    </p>
                                                ) : (
                                                    <p className="mt-0.5 text-xs text-slate-400">
                                                        Sin texto de observación
                                                    </p>
                                                )}

                                                {savedPhotos.length > 0 ? (
                                                    <div className="mt-2">
                                                        <p className="mb-1 text-[11px] font-medium text-slate-500">
                                                            Evidencia enviada
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {savedPhotos.map(
                                                                (photo) =>
                                                                    photo.url ? (
                                                                        <a
                                                                            key={
                                                                                photo.id
                                                                            }
                                                                            href={
                                                                                photo.url
                                                                            }
                                                                            target="_blank"
                                                                            rel="noreferrer"
                                                                            className="block overflow-hidden rounded-lg border border-slate-200 bg-white"
                                                                        >
                                                                            <img
                                                                                src={
                                                                                    photo.url
                                                                                }
                                                                                alt={`Evidencia ítem ${item.item_number ?? item.id}`}
                                                                                className="h-20 w-20 object-cover"
                                                                            />
                                                                        </a>
                                                                    ) : null,
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : showVerify ? (
                                                    <p className="mt-1 text-[11px] text-slate-400">
                                                        Sin imagen (no
                                                        obligatoria)
                                                    </p>
                                                ) : null}

                                                {showSubmit ? (
                                                    <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-rose-300 bg-white px-2.5 py-2 text-xs text-slate-700 transition hover:bg-rose-50/50">
                                                        <ImagePlus className="size-3.5 text-rose-600" />
                                                        <span className="truncate">
                                                            {pendingFile
                                                                ? pendingFile.name
                                                                : 'Foto de este ítem (opcional)'}
                                                        </span>
                                                        <input
                                                            type="file"
                                                            accept="image/jpeg,image/png,image/webp"
                                                            className="hidden"
                                                            onChange={(e) => {
                                                                const file =
                                                                    e.target
                                                                        .files?.[0] ??
                                                                    null;
                                                                setItemPhotos(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [item.id]:
                                                                            file,
                                                                    }),
                                                                );
                                                            }}
                                                        />
                                                    </label>
                                                ) : null}

                                                {showVerify ? (
                                                    <label className="mt-2 block text-xs font-medium text-slate-700">
                                                        Comentario del inspector
                                                        <textarea
                                                            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]/20"
                                                            rows={2}
                                                            placeholder="Observación al verificar (opcional)"
                                                            value={
                                                                itemNotes[
                                                                    item.id
                                                                ] ?? ''
                                                            }
                                                            onChange={(e) =>
                                                                setItemNotes(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [item.id]:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    </label>
                                                ) : null}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                    {showSubmit ? (
                        <p className="mt-2 text-xs text-slate-500">
                            Sube evidencia por cada ítem en NO (opcional) y
                            envía el paquete. El inspector confirma el 100 %
                            SÍ.
                        </p>
                    ) : null}
                    {showVerify ? (
                        <p className="mt-2 text-xs text-slate-500">
                            Marca el check de cada ítem. Las fotos son
                            opcionales; si hay, revísalas. Al aprobar, todos
                            pasan a SÍ y la inspección queda aprobada al 100 %.
                        </p>
                    ) : null}
                </div>

                {unit.remediation.rejection_note ? (
                    <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
                        <XCircle className="mt-0.5 size-4 shrink-0" />
                        <p>
                            Rechazo anterior:{' '}
                            {unit.remediation.rejection_note}
                        </p>
                    </div>
                ) : null}

                {showSubmit ? (
                    <div className="space-y-3 rounded-2xl border border-amber-200/70 bg-amber-50/40 p-3">
                        <label className="block text-sm font-semibold text-slate-800">
                            Nota general para el inspector (opcional)
                            <textarea
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]/20"
                                rows={2}
                                value={submitNote}
                                onChange={(e) => setSubmitNote(e.target.value)}
                            />
                        </label>
                    </div>
                ) : null}

                {showVerify ? (
                    <div className="space-y-3 rounded-2xl border border-sky-200/80 bg-sky-50/50 p-3">
                        <p className="text-sm text-slate-600">
                            Con todos los checks marcados, al aprobar la
                            inspección pasa a <strong>Aprobado</strong> (100 %).
                        </p>
                        {!allChecked ? (
                            <p className="text-xs font-medium text-amber-700">
                                Faltan ítems por marcar como subsanados.
                            </p>
                        ) : null}
                        <label className="block text-sm font-semibold text-slate-800">
                            Nota general (obligatoria si rechazas)
                            <textarea
                                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]/20"
                                rows={2}
                                value={verifyForm.data.note}
                                onChange={(e) =>
                                    verifyForm.setData('note', e.target.value)
                                }
                            />
                        </label>
                    </div>
                ) : null}
            </div>
        </AppModal>
    );
}

ObservationRemediationsPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Plataforma', href: '/calendario-observaciones' },
        { title: 'Cal. observaciones', href: '/calendario-observaciones' },
    ],
};
