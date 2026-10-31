import { Head, router, useForm, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    ImagePlus,
    ShieldAlert,
    XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type DayCell = {
    date: string;
    tone: 'none' | 'green' | 'amber' | 'red';
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
};

type DayUnit = {
    checklist_id: number;
    pass: 'first' | 'second';
    pass_label: string;
    tone: 'amber' | 'red';
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
        photos: { id: number; url: string | null }[];
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
    // Monday-based: JS Sunday=0 → shift
    const mondayIndex = (first.getDay() + 6) % 7;
    const byDate = new Map(days.map((d) => [d.date, d]));
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
        const dayNum = Number(d.date.slice(-2));
        cells.push({
            key: d.date,
            inMonth: true,
            day: dayNum,
            cell: byDate.get(d.date) ?? d,
        });
    }

    while (cells.length % 7 !== 0) {
        const day = cells.length % 7;
        cells.push({
            key: `n-${cells.length}`,
            inMonth: false,
            day: day + 1,
            cell: null,
        });
    }

    return cells;
}

function toneClasses(tone: DayCell['tone'], selected: boolean) {
    if (selected) {
        return 'border-[#1e4d8c] bg-[#e8f1fb] ring-2 ring-[#1e4d8c]/25';
    }

    switch (tone) {
        case 'green':
            return 'border-emerald-200 bg-emerald-50/80 hover:bg-emerald-50';
        case 'amber':
            return 'border-amber-200 bg-amber-50/90 hover:bg-amber-50';
        case 'red':
            return 'border-rose-200 bg-rose-50/90 hover:bg-rose-50';
        default:
            return 'border-slate-200 bg-white hover:bg-slate-50';
    }
}

function chipClasses(tone: DayCell['tone']) {
    switch (tone) {
        case 'green':
            return 'bg-emerald-100 text-emerald-800';
        case 'amber':
            return 'bg-amber-100 text-amber-900';
        case 'red':
            return 'bg-rose-100 text-rose-900';
        default:
            return 'bg-slate-100 text-slate-600';
    }
}

function formatDateLabel(iso: string) {
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);

    return date.toLocaleDateString('es-PE', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function ObservationRemediationsPage() {
    const {
        calendar,
        selected_date,
        day_units,
        can_submit,
        can_verify,
    } = usePage<PageProps>().props;

    const [detail, setDetail] = useState<DayUnit | null>(null);
    const todayIso = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');

        return `${y}-${m}-${d}`;
    }, []);

    const grid = useMemo(
        () => padGrid(calendar.year, calendar.month, calendar.days),
        [calendar],
    );

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

    const years = useMemo(() => {
        const base = calendar.year;
        return [base - 1, base, base + 1];
    }, [calendar.year]);

    return (
        <>
            <Head title="Calendario de observaciones" />

            <div className="flex w-full min-w-0 max-w-none flex-col gap-5 p-4 sm:p-6">
                <div className="border-b-2 border-[#1a2b4c] pb-4">
                    <p className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                        Operaciones
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#0f1f3a]">
                        Calendario de observaciones
                    </h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600">
                        Verde: sin pendientes. Ámbar: aprobadas con observaciones
                        por levantar. Rojo: desaprobadas. El coordinador envía el
                        paquete; el inspector verifica y aprueba.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => shiftMonth(-1)}
                        aria-label="Mes anterior"
                    >
                        <ChevronLeft className="size-4" />
                    </Button>
                    <Button type="button" variant="outline" onClick={goToday}>
                        Hoy
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => shiftMonth(1)}
                        aria-label="Mes siguiente"
                    >
                        <ChevronRight className="size-4" />
                    </Button>

                    <select
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
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
                        className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
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

                    <div className="ml-auto flex flex-wrap gap-3 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-emerald-500" />
                            OK
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-amber-500" />
                            Con observaciones
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="size-2.5 rounded-full bg-rose-500" />
                            Desaprobadas
                        </span>
                    </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:p-4">
                    <div className="mb-2 grid grid-cols-7 gap-2">
                        {WEEKDAYS.map((d) => (
                            <div
                                key={d}
                                className="px-1 text-center text-[11px] font-semibold tracking-wide text-slate-500"
                            >
                                {d}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {grid.map((slot) => {
                            const selected =
                                slot.inMonth &&
                                slot.cell?.date === selected_date;
                            const isToday =
                                slot.inMonth && slot.cell?.date === todayIso;

                            return (
                                <button
                                    key={slot.key}
                                    type="button"
                                    disabled={!slot.inMonth || !slot.cell}
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
                                    className={cn(
                                        'min-h-[88px] rounded-xl border p-2 text-left transition',
                                        slot.inMonth
                                            ? toneClasses(
                                                  slot.cell?.tone ?? 'none',
                                                  Boolean(selected),
                                              )
                                            : 'cursor-default border-transparent bg-transparent text-slate-300',
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-1">
                                        <span
                                            className={cn(
                                                'inline-flex size-7 items-center justify-center rounded-full text-sm font-semibold',
                                                isToday
                                                    ? 'bg-[#1e4d8c] text-white'
                                                    : slot.inMonth
                                                      ? 'text-slate-800'
                                                      : 'text-slate-300',
                                            )}
                                        >
                                            {slot.day}
                                        </span>
                                    </div>
                                    {slot.inMonth && slot.cell?.label ? (
                                        <div
                                            className={cn(
                                                'mt-2 truncate rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                chipClasses(slot.cell.tone),
                                            )}
                                        >
                                            {slot.cell.label}
                                        </div>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {selected_date ? (
                    <section className="rounded-xl border border-slate-200 bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                            <div>
                                <h2 className="text-base font-semibold capitalize text-[#0f1f3a]">
                                    {formatDateLabel(selected_date)}
                                </h2>
                                <p className="text-xs text-slate-500">
                                    {day_units.length === 0
                                        ? 'No hay unidades pendientes este día.'
                                        : `${day_units.length} unidad(es) con observación o desaprobación.`}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    visit({
                                        year: calendar.year,
                                        month: calendar.month,
                                    })
                                }
                            >
                                Cerrar
                            </Button>
                        </div>

                        {day_units.length === 0 ? (
                            <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-slate-500">
                                <CheckCircle2 className="size-8 text-emerald-500" />
                                <p className="text-sm">
                                    Sin unidades para mostrar. El día está en
                                    verde o no tiene inspecciones accionables.
                                </p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-100">
                                {day_units.map((unit) => (
                                    <li
                                        key={`${unit.checklist_id}-${unit.pass}`}
                                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-semibold text-[#0f1f3a]">
                                                    {unit.plate_number}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                        unit.tone === 'red'
                                                            ? 'bg-rose-100 text-rose-800'
                                                            : 'bg-amber-100 text-amber-900',
                                                    )}
                                                >
                                                    {unit.grade_label}
                                                </span>
                                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                                                    {unit.pass_label}
                                                </span>
                                            </div>
                                            <p className="mt-1 truncate text-sm text-slate-600">
                                                {unit.driver_name || '—'}
                                                {unit.sede
                                                    ? ` · Sede ${unit.sede}`
                                                    : ''}
                                                {unit.garita
                                                    ? ` · Garita ${unit.garita}`
                                                    : ''}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Inspector:{' '}
                                                {unit.inspector || '—'} ·{' '}
                                                {
                                                    unit.remediation
                                                        .status_label
                                                }
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            variant={
                                                unit.tone === 'red'
                                                    ? 'outline'
                                                    : 'default'
                                            }
                                            onClick={() => setDetail(unit)}
                                        >
                                            {unit.tone === 'red'
                                                ? 'Ver detalle'
                                                : unit.can_verify
                                                  ? 'Verificar'
                                                  : unit.can_submit
                                                    ? 'Levantar'
                                                    : 'Ver paquete'}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                ) : null}
            </div>

            {detail ? (
                <RemediationDetailModal
                    unit={detail}
                    canSubmit={can_submit}
                    canVerify={can_verify}
                    onClose={() => setDetail(null)}
                />
            ) : null}
        </>
    );
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
    const submitForm = useForm<{
        pass: string;
        note: string;
        photo: File | null;
    }>({
        pass: unit.pass,
        note: '',
        photo: null,
    });

    const verifyForm = useForm<{
        pass: string;
        decision: 'approve' | 'reject';
        note: string;
    }>({
        pass: unit.pass,
        decision: 'approve',
        note: '',
    });

    const showSubmit = canSubmit && unit.can_submit;
    const showVerify = canVerify && unit.can_verify;
    const isRed = unit.tone === 'red';

    return (
        <AppModal
            open
            onClose={onClose}
            title={`${unit.plate_number} · ${unit.pass_label}`}
            description={`${unit.grade_label} · ${unit.remediation.status_label}`}
            className="max-w-2xl"
            footer={
                <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cerrar
                    </Button>
                    {showSubmit ? (
                        <Button
                            type="button"
                            disabled={submitForm.processing}
                            onClick={() => {
                                submitForm.post(
                                    `/calendario-observaciones/${unit.checklist_id}/enviar`,
                                    {
                                        forceFormData: true,
                                        preserveScroll: true,
                                        onSuccess: () => onClose(),
                                    },
                                );
                            }}
                        >
                            Enviar al inspector
                        </Button>
                    ) : null}
                    {showVerify ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                className="text-rose-700"
                                disabled={verifyForm.processing}
                                onClick={() => {
                                    verifyForm
                                        .transform((data) => ({
                                            ...data,
                                            decision: 'reject' as const,
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
                                disabled={verifyForm.processing}
                                onClick={() => {
                                    verifyForm
                                        .transform((data) => ({
                                            ...data,
                                            decision: 'approve' as const,
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
                                Aprobar levantamiento
                            </Button>
                        </>
                    ) : null}
                </div>
            }
        >
            <div className="space-y-4">
                <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p>
                        <span className="font-medium text-slate-800">
                            Conductor:
                        </span>{' '}
                        {unit.driver_name || '—'}
                    </p>
                    <p>
                        <span className="font-medium text-slate-800">
                            Inspector:
                        </span>{' '}
                        {unit.inspector || '—'}
                    </p>
                    <p>
                        <span className="font-medium text-slate-800">Sede:</span>{' '}
                        {unit.sede || '—'}
                    </p>
                    <p>
                        <span className="font-medium text-slate-800">
                            Garita:
                        </span>{' '}
                        {unit.garita || '—'}
                    </p>
                </div>

                {isRed ? (
                    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                        <ShieldAlert className="mt-0.5 size-4 shrink-0" />
                        <p>
                            Esta inspección está desaprobada. El levantamiento
                            con evidencia aplica a aprobadas con observaciones.
                        </p>
                    </div>
                ) : null}

                <div>
                    <h3 className="mb-2 text-sm font-semibold text-[#0f1f3a]">
                        Paquete de observaciones
                    </h3>
                    {unit.observations.length === 0 ? (
                        <p className="text-sm text-slate-500">
                            Sin detalle de ítems. El resultado quedó como
                            aprobado con observaciones por el umbral Pareto.
                        </p>
                    ) : (
                        <ul className="space-y-2">
                            {unit.observations.map((item) => (
                                <li
                                    key={`${item.id}-${item.checklist_item_id}`}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                                >
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800">
                                                {item.item_number
                                                    ? `${item.item_number}. `
                                                    : ''}
                                                {item.label}
                                                {item.value === 'no' ? (
                                                    <span className="ml-2 text-xs font-semibold text-rose-600">
                                                        NO
                                                    </span>
                                                ) : null}
                                            </p>
                                            {item.observations ? (
                                                <p className="mt-0.5 text-xs text-slate-600">
                                                    {item.observations}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {!isRed ? (
                        <p className="mt-2 text-xs text-slate-500">
                            Al enviar, se declara el levantamiento de todas las
                            observaciones del paquete. El inspector confirma el
                            100 % SÍ.
                        </p>
                    ) : null}
                </div>

                {unit.remediation.photos.length > 0 ? (
                    <div>
                        <h3 className="mb-2 text-sm font-semibold text-[#0f1f3a]">
                            Evidencias
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {unit.remediation.photos.map((photo) =>
                                photo.url ? (
                                    <a
                                        key={photo.id}
                                        href={photo.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block overflow-hidden rounded-lg border border-slate-200"
                                    >
                                        <img
                                            src={photo.url}
                                            alt="Evidencia"
                                            className="h-24 w-24 object-cover"
                                        />
                                    </a>
                                ) : null,
                            )}
                        </div>
                    </div>
                ) : null}

                {unit.remediation.rejection_note ? (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                        <XCircle className="mt-0.5 size-4 shrink-0" />
                        <p>
                            Rechazo anterior:{' '}
                            {unit.remediation.rejection_note}
                        </p>
                    </div>
                ) : null}

                {showSubmit ? (
                    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                        <label className="block text-sm font-medium text-slate-800">
                            Nota para el inspector (opcional)
                            <textarea
                                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                                rows={2}
                                value={submitForm.data.note}
                                onChange={(e) =>
                                    submitForm.setData('note', e.target.value)
                                }
                            />
                        </label>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700 hover:bg-slate-100">
                            <ImagePlus className="size-4" />
                            <span>
                                {submitForm.data.photo
                                    ? submitForm.data.photo.name
                                    : 'Adjuntar foto (opcional)'}
                            </span>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className="hidden"
                                onChange={(e) =>
                                    submitForm.setData(
                                        'photo',
                                        e.target.files?.[0] ?? null,
                                    )
                                }
                            />
                        </label>
                    </div>
                ) : null}

                {showVerify ? (
                    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
                        <p className="text-sm text-slate-600">
                            Al aprobar se marcarán los ítems en NO como SÍ y la
                            inspección pasará a <strong>Aprobado</strong>,
                            dejando historial de la observación.
                        </p>
                        <label className="block text-sm font-medium text-slate-800">
                            Nota (obligatoria si rechazas)
                            <textarea
                                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
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
