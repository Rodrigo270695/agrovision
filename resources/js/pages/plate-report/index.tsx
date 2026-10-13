import { Head, useForm } from '@inertiajs/react';
import { ChevronDown, Download, ScanSearch } from 'lucide-react';
import { useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'muted';

type Badge = { label: string; tone: Tone };

type DocumentRow = {
    type: string;
    label: string;
    state: 'vigente' | 'vencido' | 'falta';
    expires_at: string;
};

type Inspection = {
    id: number;
    period: string;
    inspector: string;
    first_result: string;
    first_tone: Tone;
    first_date: string;
    first_failed: string[];
    second_result: string;
    second_tone: Tone;
    second_date: string;
    second_failed: string[];
    subsanada: boolean;
    signer: string;
    signed_at: string;
};

type InductionRow = {
    id: number;
    title: string;
    acta: string;
    date: string;
    status: string;
    attendance: string;
    signed: boolean;
};

type PlateRow = {
    key: string;
    plate: string;
    found: boolean;
    driver_name: string;
    driver_dni: string;
    provider: string;
    correlative: string;
    period: string;
    coordinator: string;
    unit_status: string;
    documents: DocumentRow[];
    docs_done: number;
    docs_total: number;
    docs_expired: number;
    inspections: Inspection[];
    latest: Inspection | null;
    inductions: InductionRow[];
    badges: Badge[];
};

type Summary = {
    consulted: number;
    found: number;
    missing: number;
    rejected: number;
    docs: number;
    unsigned: number;
    without_induction: number;
};

type FilterKey =
    | 'all'
    | 'missing'
    | 'rejected'
    | 'docs'
    | 'unsigned'
    | 'without_induction';

type PageProps = {
    plates: string;
    rows: PlateRow[];
    summary: Summary | null;
    truncated: boolean;
    plateCount: number;
};

const toneClass: Record<Tone, string> = {
    ok: 'bg-emerald-50 text-emerald-800',
    bad: 'bg-red-50 text-red-700',
    warn: 'bg-amber-50 text-amber-800',
    info: 'bg-sky-50 text-sky-800',
    muted: 'bg-slate-100 text-slate-600',
};

const docStateLabel: Record<DocumentRow['state'], string> = {
    vigente: 'Vigente',
    vencido: 'Vencido',
    falta: 'Falta',
};

function countPlates(raw: string): number {
    const seen = new Set<string>();

    raw.split(/[,;\n\r]+/).forEach((chunk) => {
        chunk
            .trim()
            .split(/\s+/)
            .forEach((token) => {
                const key = token.toUpperCase().replace(/[^A-Z0-9]/g, '');

                if (key) {
                    seen.add(key);
                }
            });
    });

    return seen.size;
}

function matches(row: PlateRow, filter: FilterKey): boolean {
    if (filter === 'all') {
        return true;
    }

    if (filter === 'missing') {
        return !row.found;
    }

    if (filter === 'rejected') {
        return (
            row.latest?.first_result === 'Desaprobada' ||
            row.latest?.second_result === 'Desaprobada'
        );
    }

    if (filter === 'docs') {
        return row.found && (row.docs_done < row.docs_total || row.docs_expired > 0);
    }

    if (filter === 'unsigned') {
        return Boolean(
            row.latest &&
                !row.latest.subsanada &&
                (row.latest.first_result === 'Desaprobada' ||
                    row.latest.second_result === 'Desaprobada'),
        );
    }

    return row.found && row.inductions.length === 0;
}

function csrfToken(): string {
    const cookie = document.cookie
        .split('; ')
        .find((item) => item.startsWith('XSRF-TOKEN='));

    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
}

export default function PlateReportPage({
    plates,
    rows,
    summary,
    truncated,
}: PageProps) {
    const form = useForm({ plates });
    const [filter, setFilter] = useState<FilterKey>('all');
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    const detected = countPlates(form.data.plates);
    const visible = useMemo(
        () => rows.filter((row) => matches(row, filter)),
        [rows, filter],
    );

    const download = async () => {
        setExportError('');
        setExporting(true);

        try {
            const response = await fetch('/reporte-placas/excel', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'X-XSRF-TOKEN': csrfToken(),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({ plates: form.data.plates }),
            });

            if (!response.ok) {
                setExportError('No se pudo generar el Excel.');
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'consulta-placas.xlsx';
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            setExportError('No se pudo generar el Excel.');
        } finally {
            setExporting(false);
        }
    };

    return (
        <>
            <Head title="Consulta de placas" />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="font-display text-2xl font-semibold text-[#1a2b4c]">
                            Consulta de placas
                        </h1>
                        <p className="mt-1 max-w-2xl text-sm text-[#5a7390]">
                            Pega una placa o una lista. Cada fila dice de un
                            vistazo si tiene inspección, documentos, firma del
                            coordinador e inducción.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={rows.length === 0 || exporting}
                        onClick={download}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                    >
                        {exporting ? <Spinner /> : <Download className="size-4" />}
                        Descargar Excel
                    </Button>
                </header>

                <form
                    className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setFilter('all');
                        setOpenKey(null);
                        form.post('/reporte-placas', { preserveScroll: true });
                    }}
                >
                    <label
                        htmlFor="plates"
                        className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase"
                    >
                        Placas
                    </label>
                    <p className="mt-1 text-xs text-[#5a7390]">
                        Una debajo de otra, o separadas por coma. Hasta 400.
                    </p>
                    <textarea
                        id="plates"
                        value={form.data.plates}
                        onChange={(event) => form.setData('plates', event.target.value)}
                        rows={6}
                        placeholder={'ABC-123\nDEF-456\nGHI-789'}
                        className="mt-3 w-full resize-y rounded-xl border border-[#c5d5e6] bg-white px-3 py-2 font-mono text-sm text-[#1a2b4c] outline-none focus:border-[#2e5a9e] focus:ring-2 focus:ring-[#4a90e2]/35"
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs text-[#5a7390]">
                            {detected === 0
                                ? 'Todavía no hay placas.'
                                : `${detected} placa${detected === 1 ? '' : 's'} lista${detected === 1 ? '' : 's'} para consultar.`}
                        </p>
                        <Button
                            type="submit"
                            disabled={form.processing || detected === 0}
                            className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            {form.processing ? <Spinner /> : <ScanSearch className="size-4" />}
                            Consultar
                        </Button>
                    </div>
                    <InputError message={form.errors.plates} className="mt-2" />
                    {exportError ? (
                        <p className="mt-2 text-sm text-red-700">{exportError}</p>
                    ) : null}
                    {truncated ? (
                        <p className="mt-2 text-sm text-amber-800">
                            Se consultaron las primeras 400 placas.
                        </p>
                    ) : null}
                </form>

                {summary ? (
                    <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
                        <FilterStat
                            label="Consultadas"
                            value={summary.consulted}
                            active={filter === 'all'}
                            onClick={() => setFilter('all')}
                        />
                        <FilterStat
                            label="Sin registro"
                            value={summary.missing}
                            active={filter === 'missing'}
                            onClick={() => setFilter('missing')}
                        />
                        <FilterStat
                            label="Desaprobadas"
                            value={summary.rejected}
                            active={filter === 'rejected'}
                            onClick={() => setFilter('rejected')}
                        />
                        <FilterStat
                            label="Docs incompletos"
                            value={summary.docs}
                            active={filter === 'docs'}
                            onClick={() => setFilter('docs')}
                        />
                        <FilterStat
                            label="Sin subsanar"
                            value={summary.unsigned}
                            active={filter === 'unsigned'}
                            onClick={() => setFilter('unsigned')}
                        />
                        <FilterStat
                            label="Sin inducción"
                            value={summary.without_induction}
                            active={filter === 'without_induction'}
                            onClick={() => setFilter('without_induction')}
                        />
                    </div>
                ) : (
                    <p className="rounded-2xl border border-dashed border-[#d7e3f0] bg-white px-4 py-8 text-center text-sm text-[#5a7390]">
                        El resultado queda en una fila por placa. Abre el
                        detalle solo cuando necesites ver qué ítem no pasó, qué
                        documento falta o qué inducción tiene.
                    </p>
                )}

                {summary && visible.length === 0 ? (
                    <p className="text-sm text-[#5a7390]">
                        Ninguna placa coincide con este filtro.
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
                                                {row.plate}
                                            </h2>
                                            <p className="truncate text-sm text-[#5a7390]">
                                                {row.driver_name || 'Sin conductor'}
                                                {row.driver_dni ? ` · ${row.driver_dni}` : ''}
                                                {row.provider ? ` · ${row.provider}` : ''}
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
                                        onClick={() => setOpenKey(open ? null : row.key)}
                                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                    >
                                        {open ? 'Ocultar detalle' : 'Ver detalle'}
                                        <ChevronDown
                                            className={cn(
                                                'size-4 transition-transform',
                                                open && 'rotate-180',
                                            )}
                                        />
                                    </Button>
                                </div>

                                {open ? <Detail row={row} /> : null}
                            </article>
                        );
                    })}
                </div>
            </div>
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
            <p className={cn('text-[10px] font-semibold tracking-wide uppercase', active ? 'text-white/70' : 'text-[#6b8ead]')}>
                {label}
            </p>
            <p className="text-lg font-bold">{value}</p>
        </button>
    );
}

function Detail({ row }: { row: PlateRow }) {
    if (!row.found) {
        return (
            <div className="border-t border-[#e2eaf3] px-4 py-4 text-sm text-[#5a7390]">
                Esta placa no tiene unidad, inspección ni inducción.
            </div>
        );
    }

    return (
        <div className="grid gap-4 border-t border-[#e2eaf3] px-4 py-4 lg:grid-cols-3">
            <section>
                <h3 className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                    Unidad y documentos
                </h3>
                <p className="mt-2 text-sm text-[#5a7390]">
                    {row.unit_status || 'Sin unidad'}
                    {row.period ? ` · ${row.period}` : ''}
                    {row.correlative ? ` · ${row.correlative}` : ''}
                    {row.coordinator ? ` · Coord. ${row.coordinator}` : ''}
                </p>
                <ul className="mt-3 space-y-1.5">
                    {row.documents.map((document) => (
                        <li
                            key={document.type}
                            className="flex items-center justify-between gap-3 text-sm"
                        >
                            <span className="text-[#1a2b4c]">{document.label}</span>
                            <span
                                className={cn(
                                    'rounded-full px-2 py-0.5 text-xs font-medium',
                                    document.state === 'vigente' && toneClass.ok,
                                    document.state === 'vencido' && toneClass.warn,
                                    document.state === 'falta' && toneClass.bad,
                                )}
                            >
                                {docStateLabel[document.state]}
                                {document.expires_at ? ` ${document.expires_at}` : ''}
                            </span>
                        </li>
                    ))}
                </ul>
            </section>

            <section>
                <h3 className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                    Inspecciones
                </h3>
                {row.inspections.length === 0 ? (
                    <p className="mt-2 text-sm text-[#5a7390]">Sin inspección.</p>
                ) : (
                    <div className="mt-2 space-y-3">
                        {row.inspections.map((inspection) => (
                            <div
                                key={inspection.id}
                                className="rounded-xl border border-[#e2eaf3] p-3"
                            >
                                <p className="text-xs text-[#5a7390]">
                                    {inspection.period || 'Sin periodo'}
                                    {inspection.inspector ? ` · ${inspection.inspector}` : ''}
                                </p>
                                <PassLine
                                    label="1ra"
                                    result={inspection.first_result}
                                    tone={inspection.first_tone}
                                    date={inspection.first_date}
                                    failed={inspection.first_failed}
                                />
                                <PassLine
                                    label="2da"
                                    result={inspection.second_result}
                                    tone={inspection.second_tone}
                                    date={inspection.second_date}
                                    failed={inspection.second_failed}
                                />
                                <p className="mt-2 text-xs text-[#5a7390]">
                                    {inspection.subsanada
                                        ? `Subsanada${inspection.signer ? ` por ${inspection.signer}` : ''}${inspection.signed_at ? ` · ${inspection.signed_at}` : ''}`
                                        : 'Sin firma del coordinador'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section>
                <h3 className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                    Inducciones
                </h3>
                {row.inductions.length === 0 ? (
                    <p className="mt-2 text-sm text-[#5a7390]">
                        Este conductor no figura en inducciones.
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
                                    {induction.date || 'Sin fecha'}
                                    {induction.acta ? ` · Acta ${induction.acta}` : ''}
                                    {` · ${induction.status}`}
                                    {` · ${induction.attendance}`}
                                    {induction.signed ? ' · Firmó' : ' · Sin firma'}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

function PassLine({
    label,
    result,
    tone,
    date,
    failed,
}: {
    label: string;
    result: string;
    tone: Tone;
    date: string;
    failed: string[];
}) {
    return (
        <div className="mt-2">
            <p className="text-sm text-[#1a2b4c]">
                <span className="font-medium">{label}</span>{' '}
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', toneClass[tone])}>
                    {result}
                </span>
                {date ? <span className="text-[#5a7390]"> · {date}</span> : null}
            </p>
            {failed.length > 0 ? (
                <ul className="mt-1 list-disc pl-4 text-xs text-red-700">
                    {failed.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            ) : null}
        </div>
    );
}

PlateReportPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Reportes', href: '/reporte-placas' },
        { title: 'Consulta de placas', href: '/reporte-placas' },
    ],
};
