import { Head, useForm } from '@inertiajs/react';
import {
    ChevronDown,
    Download,
    FileSpreadsheet,
    ListPlus,
    ScanSearch,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    InductionFormModal,
    type InductionGapDraft,
} from '@/components/inductions/induction-form-modal';
import type {
    InductionFormOptions,
    PeriodOption,
} from '@/components/inductions/induction-form-fields';
import InputError from '@/components/input-error';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { useCan } from '@/hooks/use-can';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'muted';

type Badge = { label: string; tone: Tone };

type DocKind = 'acta' | 'risst' | 'ritran';

type InductionRow = {
    id: number;
    attendee_id: number;
    title: string;
    induction_type?: string | null;
    activity: string;
    activity_label: string;
    acta: string;
    date: string;
    date_iso: string;
    status: string;
    status_key: string;
    attendance: string;
    signed: boolean;
    location: string;
    closed: boolean;
    allows_receipts: boolean;
};

type DriverRow = {
    key: string;
    dni: string;
    found: boolean;
    driver_name: string;
    provider: string;
    plate: string;
    inductions: InductionRow[];
    missing: string[];
    badges: Badge[];
};

type Summary = {
    consulted: number;
    found: number;
    missing: number;
    activities: number;
    unsigned: number;
    lacking: number;
};

type FilterKey = 'all' | 'missing' | 'found' | 'unsigned' | 'lacking';

type DownloadGroup = {
    induction_id: number;
    title: string;
    activity_label: string;
    date: string;
    date_iso: string;
    acta: string;
    drivers: { dni: string; name: string }[];
    allows_receipts: boolean;
    include: Record<DocKind, boolean>;
};

type GapRow = {
    key: string;
    title: string;
    induction_type?: string | null;
    activity: string;
    activity_label: string;
    drivers: { dni: string; name: string }[];
};

function inductionTopicKey(induction: Pick<InductionRow, 'title' | 'induction_type'>): string {
    const type = (induction.induction_type ?? '').trim();

    if (type !== '') {
        return `type:${type}`;
    }

    return `title:${induction.title.trim().toLocaleLowerCase()}`;
}

type PageProps = {
    dnis: string;
    rows: DriverRow[];
    summary: Summary | null;
    truncated: boolean;
    dniCount: number;
    periodOptions?: PeriodOption[];
    formOptions?: InductionFormOptions;
};

const toneClass: Record<Tone, string> = {
    ok: 'bg-emerald-50 text-emerald-800',
    bad: 'bg-red-50 text-red-700',
    warn: 'bg-amber-50 text-amber-800',
    info: 'bg-sky-50 text-sky-800',
    muted: 'bg-slate-100 text-slate-600',
};

const docLabels: Record<DocKind, string> = {
    acta: 'Acta',
    risst: 'RISST',
    ritran: 'RITRAN',
};

function countDnis(raw: string): number {
    const seen = new Set<string>();

    raw.split(/[,;\n\r]+/).forEach((chunk) => {
        chunk
            .trim()
            .split(/\s+/)
            .forEach((token) => {
                const key = token.replace(/\D+/g, '');

                if (key.length >= 6) {
                    seen.add(key);
                }
            });
    });

    return seen.size;
}

function matches(row: DriverRow, filter: FilterKey): boolean {
    if (filter === 'missing') {
        return !row.found;
    }

    if (filter === 'found') {
        return row.found;
    }

    if (filter === 'unsigned') {
        return row.found && row.inductions.some((item) => !item.signed);
    }

    if (filter === 'lacking') {
        return (row.missing ?? []).length > 0;
    }

    return true;
}

function csrfToken(): string {
    const cookie = document.cookie
        .split('; ')
        .find((item) => item.startsWith('XSRF-TOKEN='));

    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
}

function buildGroups(rows: DriverRow[]): DownloadGroup[] {
    const map = new Map<number, DownloadGroup>();

    rows.forEach((row) => {
        row.inductions.forEach((induction) => {
            const current = map.get(induction.id);

            if (current) {
                if (!current.drivers.some((driver) => driver.dni === row.key)) {
                    current.drivers.push({
                        dni: row.key,
                        name: row.driver_name || row.dni,
                    });
                }

                return;
            }

            map.set(induction.id, {
                induction_id: induction.id,
                title: induction.title,
                activity_label: induction.activity_label,
                date: induction.date,
                date_iso: induction.date_iso,
                acta: induction.acta,
                drivers: [
                    {
                        dni: row.key,
                        name: row.driver_name || row.dni,
                    },
                ],
                allows_receipts:
                    induction.allows_receipts ??
                    induction.activity === 'induccion',
                include: {
                    acta: true,
                    risst: false,
                    ritran: false,
                },
            });
        });
    });

    return [...map.values()].sort((left, right) => {
        if (left.date_iso === right.date_iso) {
            return left.title.localeCompare(right.title, 'es');
        }

        return right.date_iso.localeCompare(left.date_iso);
    });
}

function buildGaps(rows: DriverRow[]): GapRow[] {
    const topics = new Map<
        string,
        {
            title: string;
            induction_type?: string | null;
            activity: string;
            activity_label: string;
        }
    >();

    rows.forEach((row) => {
        row.inductions.forEach((induction) => {
            const key = inductionTopicKey(induction);

            if (!key || key === 'title:' || topics.has(key)) {
                return;
            }

            topics.set(key, {
                title: induction.title.trim(),
                induction_type: induction.induction_type ?? null,
                activity: induction.activity,
                activity_label: induction.activity_label,
            });
        });
    });

    return [...topics.entries()]
        .map(([key, topic]) => ({
            key,
            ...topic,
            drivers: rows
                .filter(
                    (row) =>
                        !row.inductions.some(
                            (induction) => inductionTopicKey(induction) === key,
                        ),
                )
                .map((row) => ({
                    dni: row.key,
                    name: row.driver_name || row.dni,
                })),
        }))
        .filter((gap) => gap.drivers.length > 0)
        .sort((left, right) =>
            left.title.localeCompare(right.title, 'es'),
        );
}

export default function DriverReportPage({
    dnis,
    rows,
    summary,
    truncated,
    periodOptions = [],
    formOptions,
}: PageProps) {
    const { can } = useCan();
    const form = useForm({ dnis });
    const [filter, setFilter] = useState<FilterKey>('all');
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [gapsOpen, setGapsOpen] = useState(false);
    const [gap, setGap] = useState<InductionGapDraft | null>(null);
    const [doneGapKeys, setDoneGapKeys] = useState<string[]>([]);
    const [groups, setGroups] = useState<DownloadGroup[]>([]);
    const [exporting, setExporting] = useState(false);
    const [excelLoading, setExcelLoading] = useState(false);
    const [exportError, setExportError] = useState('');
    const detected = countDnis(form.data.dnis);
    const visible = useMemo(
        () => rows.filter((row) => matches(row, filter)),
        [rows, filter],
    );
    const gaps = useMemo(
        () => buildGaps(rows).filter((item) => !doneGapKeys.includes(item.key)),
        [rows, doneGapKeys],
    );
    const canComplete = can('inductions.create');

    const openModal = () => {
        setExportError('');
        setGroups(buildGroups(visible.filter((row) => row.found)));
        setModalOpen(true);
    };

    const toggleDoc = (inductionId: number, kind: DocKind, checked: boolean) => {
        setGroups((current) =>
            current.map((group) => {
                if (group.induction_id !== inductionId) {
                    return group;
                }

                if (
                    (kind === 'risst' || kind === 'ritran') &&
                    !group.allows_receipts
                ) {
                    return group;
                }

                return {
                    ...group,
                    include: { ...group.include, [kind]: checked },
                };
            }),
        );
    };

    const setAllDoc = (kind: DocKind, checked: boolean) => {
        setGroups((current) =>
            current.map((group) => {
                if (
                    (kind === 'risst' || kind === 'ritran') &&
                    !group.allows_receipts
                ) {
                    return group;
                }

                return {
                    ...group,
                    include: { ...group.include, [kind]: checked },
                };
            }),
        );
    };

    const payload = groups
        .map((group) => ({
            induction_id: group.induction_id,
            include: (Object.keys(group.include) as DocKind[]).filter(
                (kind) => group.include[kind],
            ),
            dnis: group.drivers.map((driver) => driver.dni),
        }))
        .filter((group) => group.include.length > 0);

    const download = async () => {
        setExportError('');

        if (payload.length === 0) {
            setExportError('Marca acta, RISST o RITRAN en al menos una actividad.');
            return;
        }

        setExporting(true);

        try {
            const response = await fetch('/consulta-conductores/archivo', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/zip,application/pdf',
                    'X-XSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ groups: payload }),
            });

            if (!response.ok) {
                const data = (await response.json().catch(() => null)) as {
                    message?: string;
                } | null;
                setExportError(data?.message || 'No se pudo generar el archivo.');
                return;
            }

            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition') ?? '';
            const zip =
                disposition.includes('.zip') || blob.type.includes('zip');
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = zip
                ? 'consulta-conductores.zip'
                : 'consulta-conductores.pdf';
            link.click();
            URL.revokeObjectURL(url);
            setModalOpen(false);
        } catch {
            setExportError('No se pudo generar el archivo.');
        } finally {
            setExporting(false);
        }
    };

    const downloadExcel = async () => {
        setExportError('');
        setExcelLoading(true);

        try {
            const response = await fetch('/consulta-conductores/excel', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'X-XSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ dnis: form.data.dnis }),
            });

            if (!response.ok) {
                setExportError('No se pudo generar el Excel.');
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'consulta-conductores.xlsx';
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            setExportError('No se pudo generar el Excel.');
        } finally {
            setExcelLoading(false);
        }
    };

    const openDoc = (dni: string, inductionId: number, doc: DocKind) => {
        window.open(
            `/consulta-conductores/documento?dni=${encodeURIComponent(dni)}&induction_id=${inductionId}&doc=${doc}`,
            '_blank',
            'noopener,noreferrer',
        );
    };

    return (
        <>
            <Head title="Consulta de conductores" />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-semibold text-[#1a2b4c]">
                            Consulta de conductores
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-[#5a7390]">
                            Pega los DNI. Cada fila muestra lo que ya cubrió y
                            lo que le falta. Un solo botón descarga el paquete.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {canComplete ? (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={gaps.length === 0}
                                onClick={() => setGapsOpen(true)}
                                className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                            >
                                <ListPlus className="size-4" />
                                Completar faltantes
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            variant="outline"
                            disabled={rows.length === 0 || excelLoading}
                            onClick={() => void downloadExcel()}
                            className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                        >
                            {excelLoading ? (
                                <Spinner />
                            ) : (
                                <FileSpreadsheet className="size-4" />
                            )}
                            Excel
                        </Button>
                        <Button
                            type="button"
                            disabled={
                                rows.every((row) => !row.found) || exporting
                            }
                            onClick={openModal}
                            className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            <Download className="size-4" />
                            Descargar
                        </Button>
                    </div>
                </header>

                <form
                    className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setFilter('all');
                        setOpenKey(null);
                        setDoneGapKeys([]);
                        form.post('/consulta-conductores', {
                            preserveScroll: true,
                        });
                    }}
                >
                    <label
                        htmlFor="dnis"
                        className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase"
                    >
                        DNI
                    </label>
                    <p className="mt-1 text-xs text-[#5a7390]">
                        Uno debajo de otro, o separados por coma. Hasta 400.
                    </p>
                    <textarea
                        id="dnis"
                        value={form.data.dnis}
                        onChange={(event) =>
                            form.setData('dnis', event.target.value)
                        }
                        rows={5}
                        placeholder={'17626115\n48142513\n72774363'}
                        className="mt-3 w-full resize-y rounded-xl border border-[#c5d5e6] bg-white px-3 py-2 font-mono text-sm text-[#1a2b4c] outline-none focus:border-[#2e5a9e] focus:ring-2 focus:ring-[#4a90e2]/35"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-[#5a7390]">
                            {detected === 0
                                ? 'Todavía no hay DNI.'
                                : `${detected} DNI listo${detected === 1 ? '' : 's'} para consultar.`}
                        </p>
                        <Button
                            type="submit"
                            disabled={form.processing || detected === 0}
                            className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            {form.processing ? (
                                <Spinner />
                            ) : (
                                <ScanSearch className="size-4" />
                            )}
                            Consultar
                        </Button>
                    </div>
                    <InputError message={form.errors.dnis} className="mt-2" />
                    {truncated ? (
                        <p className="mt-2 text-sm text-amber-800">
                            Se consultaron los primeros 400 DNI.
                        </p>
                    ) : null}
                </form>

                {summary ? (
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        <FilterStat
                            label="Consultados"
                            value={summary.consulted}
                            active={filter === 'all'}
                            onClick={() => setFilter('all')}
                        />
                        <FilterStat
                            label="Con actividades"
                            value={summary.found}
                            active={filter === 'found'}
                            onClick={() => setFilter('found')}
                        />
                        <FilterStat
                            label="Sin registro"
                            value={summary.missing}
                            active={filter === 'missing'}
                            onClick={() => setFilter('missing')}
                        />
                        <FilterStat
                            label="Les falta"
                            value={summary.lacking}
                            active={filter === 'lacking'}
                            onClick={() => setFilter('lacking')}
                        />
                        <FilterStat
                            label="Actividades"
                            value={summary.activities}
                            active={false}
                            onClick={() => setFilter('all')}
                        />
                        <FilterStat
                            label="Sin firma"
                            value={summary.unsigned}
                            active={filter === 'unsigned'}
                            onClick={() => setFilter('unsigned')}
                        />
                    </div>
                ) : (
                    <p className="rounded-2xl border border-dashed border-[#d7e3f0] bg-white px-4 py-8 text-center text-sm text-[#5a7390]">
                        Consulta los DNI y luego descarga. Si varios coinciden
                        en la misma acta, se genera una sola y se resalta a
                        esas personas.
                    </p>
                )}

                {summary && visible.length === 0 ? (
                    <p className="text-sm text-[#5a7390]">
                        Ningún conductor coincide con este filtro.
                    </p>
                ) : null}

                <div className="flex flex-col gap-2">
                    {visible.map((row) => {
                        const open = openKey === row.key;

                        return (
                            <article
                                key={row.key}
                                className="rounded-2xl border border-[#d7e3f0] bg-white shadow-sm"
                            >
                                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                            <h2 className="font-mono text-lg font-semibold text-[#1a2b4c]">
                                                {row.dni}
                                            </h2>
                                            <p className="truncate text-sm text-[#5a7390]">
                                                {row.driver_name || 'Sin nombre'}
                                                {row.plate ? ` · ${row.plate}` : ''}
                                                {row.provider
                                                    ? ` · ${row.provider}`
                                                    : ''}
                                            </p>
                                        </div>
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {row.badges.map((badge) => (
                                                <span
                                                    key={badge.label}
                                                    className={cn(
                                                        'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                                                        toneClass[badge.tone],
                                                    )}
                                                >
                                                    {badge.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        aria-expanded={open}
                                        onClick={() =>
                                            setOpenKey(open ? null : row.key)
                                        }
                                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                    >
                                        {open ? 'Ocultar' : 'Detalle'}
                                        <ChevronDown
                                            className={cn(
                                                'size-4 transition-transform',
                                                open && 'rotate-180',
                                            )}
                                        />
                                    </Button>
                                </div>

                                {open ? (
                                    <Detail row={row} onOpen={openDoc} />
                                ) : null}
                            </article>
                        );
                    })}
                </div>
            </div>

            <AppModal
                open={modalOpen}
                onClose={() => {
                    if (!exporting) {
                        setModalOpen(false);
                    }
                }}
                title="Descargar documentos"
                description="Lo marcado se une en un PDF. RISST y RITRAN solo en inducciones. Capacitaciones y el resto llevan acta, formato y foto."
                className="max-h-[min(92vh,56rem)] sm:max-w-2xl"
                bodyClassName="max-h-[min(62vh,38rem)]"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={exporting}
                            onClick={() => setModalOpen(false)}
                            className="cursor-pointer"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            disabled={exporting || payload.length === 0}
                            onClick={() => void download()}
                            className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            {exporting ? <Spinner /> : <Download className="size-4" />}
                            Descargar
                        </Button>
                    </>
                }
            >
                <div className="mb-3 flex flex-wrap gap-2">
                    {(Object.keys(docLabels) as DocKind[]).map((kind) => {
                        const targets =
                            kind === 'acta'
                                ? groups
                                : groups.filter((group) => group.allows_receipts);

                        if (kind !== 'acta' && targets.length === 0) {
                            return null;
                        }

                        const on =
                            targets.length > 0 &&
                            targets.every((group) => group.include[kind]);

                        return (
                            <button
                                key={kind}
                                type="button"
                                onClick={() => setAllDoc(kind, !on)}
                                className={cn(
                                    'cursor-pointer rounded-full border px-3 py-1 text-xs font-medium',
                                    on
                                        ? 'border-[#1a2b4c] bg-[#1a2b4c] text-white'
                                        : 'border-[#d7e3f0] text-[#1a2b4c] hover:bg-[#f8fafc]',
                                )}
                            >
                                {on ? 'Quitar' : 'Marcar'} {docLabels[kind]}
                            </button>
                        );
                    })}
                </div>

                {exportError ? (
                    <p className="mb-3 text-sm text-red-700">{exportError}</p>
                ) : null}

                {groups.length === 0 ? (
                    <p className="text-sm text-[#5a7390]">
                        No hay actividades para descargar.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {groups.map((group) => (
                            <li
                                key={group.induction_id}
                                className="rounded-xl border border-[#e2eaf3] p-3"
                            >
                                <p className="text-sm font-medium text-[#1a2b4c]">
                                    {group.title}
                                </p>
                                <p className="mt-0.5 text-xs text-[#5a7390]">
                                    {group.activity_label}
                                    {group.date ? ` · ${group.date}` : ''}
                                    {group.acta ? ` · Acta ${group.acta}` : ''}
                                </p>
                                <p className="mt-1 text-xs text-[#2e5a9e]">
                                    {group.drivers
                                        .map((driver) => driver.name)
                                        .join(' · ')}
                                    {group.drivers.length > 1
                                        ? ' · un acta, resaltados'
                                        : ''}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-4">
                                    {(
                                        [
                                            'acta',
                                            ...(group.allows_receipts
                                                ? (['risst', 'ritran'] as const)
                                                : []),
                                        ] as DocKind[]
                                    ).map((kind) => (
                                        <label
                                            key={kind}
                                            className="flex cursor-pointer items-center gap-2 text-sm text-[#1a2b4c]"
                                        >
                                            <Checkbox
                                                checked={group.include[kind]}
                                                onCheckedChange={(checked) =>
                                                    toggleDoc(
                                                        group.induction_id,
                                                        kind,
                                                        checked === true,
                                                    )
                                                }
                                                className="border-[#c5d5e6] data-[state=checked]:border-[#2e5a9e] data-[state=checked]:bg-[#2e5a9e]"
                                            />
                                            {docLabels[kind]}
                                        </label>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </AppModal>

            <AppModal
                open={gapsOpen}
                onClose={() => setGapsOpen(false)}
                title="Completar faltantes"
                description="Un tema a la vez. Solo entran los conductores consultados que no lo tienen."
                className="max-h-[min(92vh,56rem)] sm:max-w-2xl"
                bodyClassName="max-h-[min(62vh,38rem)]"
                footer={
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => setGapsOpen(false)}
                        className="cursor-pointer"
                    >
                        Cerrar
                    </Button>
                }
            >
                {gaps.length === 0 ? (
                    <p className="text-sm text-[#5a7390]">
                        En este grupo no hay temas pendientes.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {gaps.map((item) => (
                            <li
                                key={item.key}
                                className="flex items-start justify-between gap-3 rounded-xl border border-[#e2eaf3] p-3"
                            >
                                <div>
                                    <p className="text-sm font-medium text-[#1a2b4c]">
                                        {item.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-[#5a7390]">
                                        {item.activity_label} ·{' '}
                                        {item.drivers.length} conductor
                                        {item.drivers.length === 1 ? '' : 'es'}
                                    </p>
                                    <p className="mt-1 text-xs text-[#2e5a9e]">
                                        {item.drivers
                                            .map((driver) => driver.name)
                                            .join(' · ')}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setGapsOpen(false);
                                        setGap({
                                            key: item.key,
                                            title: item.title,
                                            induction_type: item.induction_type ?? null,
                                            activity: item.activity,
                                            drivers: item.drivers,
                                        });
                                    }}
                                    className="shrink-0 cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
                                >
                                    Crear
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </AppModal>

            {formOptions ? (
                <InductionFormModal
                    open={Boolean(gap)}
                    gap={gap}
                    periodOptions={periodOptions}
                    formOptions={formOptions}
                    onClose={() => {
                        setGap(null);
                        setGapsOpen(true);
                    }}
                    onCreated={(created) => {
                        setDoneGapKeys((current) =>
                            current.includes(created.key)
                                ? current
                                : [...current, created.key],
                        );
                    }}
                />
            ) : null}
        </>
    );
}

function FilterStat({
    label,
    value,
    active,
    onClick,
}: {
    label: string;
    value: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'cursor-pointer rounded-2xl border px-3 py-2 text-left',
                active
                    ? 'border-[#1a2b4c] bg-[#1a2b4c] text-white'
                    : 'border-[#d7e3f0] bg-white text-[#1a2b4c] hover:bg-[#f8fafc]',
            )}
        >
            <p
                className={cn(
                    'text-[10px] font-semibold tracking-wide uppercase',
                    active ? 'text-white/70' : 'text-[#6b8ead]',
                )}
            >
                {label}
            </p>
            <p className="text-lg font-bold">{value}</p>
        </button>
    );
}

function Detail({
    row,
    onOpen,
}: {
    row: DriverRow;
    onOpen: (dni: string, inductionId: number, doc: DocKind) => void;
}) {
    return (
        <div className="grid gap-4 border-t border-[#e2eaf3] px-4 py-4 lg:grid-cols-2">
            <section>
                <h3 className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                    Cubiertas
                </h3>
                {row.inductions.length === 0 ? (
                    <p className="mt-2 text-sm text-[#5a7390]">
                        Sin inducciones ni capacitaciones.
                    </p>
                ) : (
                    <ul className="mt-2 space-y-2">
                        {row.inductions.map((induction) => (
                            <li
                                key={induction.id}
                                className="rounded-xl border border-[#e2eaf3] px-3 py-2"
                            >
                                <p className="text-sm font-medium text-[#1a2b4c]">
                                    {induction.title}
                                </p>
                                <p className="mt-0.5 text-xs text-[#5a7390]">
                                    {induction.activity_label}
                                    {induction.date ? ` · ${induction.date}` : ''}
                                    {induction.acta
                                        ? ` · Acta ${induction.acta}`
                                        : ''}
                                    {` · ${induction.status}`}
                                    {induction.signed ? ' · Firmó' : ' · Sin firma'}
                                </p>
                                <div className="mt-1.5 flex flex-wrap gap-2 text-xs">
                                    {(
                                        [
                                            'acta',
                                            ...(induction.allows_receipts
                                                ? (['risst', 'ritran'] as const)
                                                : []),
                                        ] as DocKind[]
                                    ).map((doc) => (
                                        <button
                                            key={doc}
                                            type="button"
                                            onClick={() =>
                                                onOpen(
                                                    row.key,
                                                    induction.id,
                                                    doc,
                                                )
                                            }
                                            className="cursor-pointer font-medium text-[#2e5a9e] underline-offset-2 hover:underline"
                                        >
                                            Ver {docLabels[doc]}
                                        </button>
                                    ))}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <section>
                <h3 className="text-xs font-semibold tracking-wide text-[#b91c1c] uppercase">
                    Les falta
                </h3>
                {(row.missing ?? []).length === 0 ? (
                    <p className="mt-2 text-sm text-[#5a7390]">
                        En este grupo no le falta una actividad que los demás
                        sí tienen.
                    </p>
                ) : (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                        {row.missing.map((item) => (
                            <li
                                key={item}
                                className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700"
                            >
                                {item}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

DriverReportPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Reportes', href: '/consulta-conductores' },
        { title: 'Consulta de conductores', href: '/consulta-conductores' },
    ],
};
