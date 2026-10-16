import { Head, useForm } from '@inertiajs/react';
import { ChevronDown, Download, FileText, ScanSearch } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type Tone = 'ok' | 'bad' | 'warn' | 'info' | 'muted';

type Badge = { label: string; tone: Tone };

type DocKind = 'acta' | 'risst' | 'ritran';

type InductionRow = {
    id: number;
    attendee_id: number;
    title: string;
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
};

type DriverRow = {
    key: string;
    dni: string;
    found: boolean;
    driver_name: string;
    provider: string;
    plate: string;
    inductions: InductionRow[];
    badges: Badge[];
};

type Summary = {
    consulted: number;
    found: number;
    missing: number;
    activities: number;
    unsigned: number;
};

type FilterKey = 'all' | 'missing' | 'found' | 'unsigned';

type PageProps = {
    dnis: string;
    rows: DriverRow[];
    summary: Summary | null;
    truncated: boolean;
    dniCount: number;
};

const toneClass: Record<Tone, string> = {
    ok: 'bg-emerald-50 text-emerald-800',
    bad: 'bg-red-50 text-red-700',
    warn: 'bg-amber-50 text-amber-800',
    info: 'bg-sky-50 text-sky-800',
    muted: 'bg-slate-100 text-slate-600',
};

const docLabels: Record<DocKind, string> = {
    acta: 'Acta + formato',
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

function itemKey(dni: string, inductionId: number): string {
    return `${dni.replace(/\D+/g, '')}:${inductionId}`;
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

    return true;
}

function csrfToken(): string {
    const cookie = document.cookie
        .split('; ')
        .find((item) => item.startsWith('XSRF-TOKEN='));

    return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : '';
}

export default function DriverReportPage({
    dnis,
    rows,
    summary,
    truncated,
}: PageProps) {
    const form = useForm({ dnis });
    const [filter, setFilter] = useState<FilterKey>('all');
    const [openKey, setOpenKey] = useState<string | null>(null);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState('');
    const [docs, setDocs] = useState<Record<DocKind, boolean>>({
        acta: true,
        risst: true,
        ritran: true,
    });
    const [selected, setSelected] = useState<Record<string, boolean>>({});
    const detected = countDnis(form.data.dnis);
    const visible = useMemo(
        () => rows.filter((row) => matches(row, filter)),
        [rows, filter],
    );
    const include = (Object.keys(docs) as DocKind[]).filter((key) => docs[key]);

    useEffect(() => {
        const next: Record<string, boolean> = {};

        rows.forEach((row) => {
            row.inductions.forEach((induction) => {
                next[itemKey(row.key, induction.id)] = true;
            });
        });

        setSelected(next);
    }, [rows]);

    const itemsOf = (subset: DriverRow[]) =>
        subset.flatMap((row) =>
            row.inductions
                .filter((induction) => selected[itemKey(row.key, induction.id)])
                .map((induction) => ({
                    dni: row.key,
                    induction_id: induction.id,
                })),
        );

    const download = async (subset: DriverRow[], grouped: boolean) => {
        const items = itemsOf(subset);
        setExportError('');

        if (include.length === 0) {
            setExportError('Marca acta, RISST o RITRAN.');
            return;
        }

        if (items.length === 0) {
            setExportError('Marca al menos una inducción.');
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
                body: JSON.stringify({ include, items, grouped }),
            });

            if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as {
                    message?: string;
                } | null;
                setExportError(
                    payload?.message || 'No se pudo generar el archivo.',
                );
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
        } catch {
            setExportError('No se pudo generar el archivo.');
        } finally {
            setExporting(false);
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
                            Pega uno o varios DNI. Verás las inducciones,
                            capacitaciones y demás actividades, y podrás
                            descargar el acta (con formato), el RISST y el
                            RITRAN de cada persona. Si varios DNI coinciden en
                            la misma acta, el ZIP incluye una sola y resalta a
                            esos conductores.
                        </p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={rows.length === 0 || exporting}
                        onClick={() => download(visible, visible.length > 1)}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                    >
                        {exporting ? <Spinner /> : <Download className="size-4" />}
                        Descargar ZIP
                    </Button>
                </header>

                <form
                    className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm"
                    onSubmit={(event) => {
                        event.preventDefault();
                        setFilter('all');
                        setOpenKey(null);
                        form.post('/consulta-conductores', { preserveScroll: true });
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
                        onChange={(event) => form.setData('dnis', event.target.value)}
                        rows={6}
                        placeholder={'17626115\n48142513\n72774363'}
                        className="mt-3 w-full resize-y rounded-xl border border-[#c5d5e6] bg-white px-3 py-2 font-mono text-sm text-[#1a2b4c] outline-none focus:border-[#2e5a9e] focus:ring-2 focus:ring-[#4a90e2]/35"
                    />
                    <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-[#e2eaf3] pt-3">
                        <p className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                            En el consolidado
                        </p>
                        {(Object.keys(docLabels) as DocKind[]).map((kind) => (
                            <label
                                key={kind}
                                className="flex cursor-pointer items-center gap-2 text-sm text-[#1a2b4c]"
                            >
                                <Checkbox
                                    checked={docs[kind]}
                                    onCheckedChange={(checked) =>
                                        setDocs((current) => ({
                                            ...current,
                                            [kind]: checked === true,
                                        }))
                                    }
                                    className="border-[#c5d5e6] data-[state=checked]:border-[#2e5a9e] data-[state=checked]:bg-[#2e5a9e]"
                                />
                                {docLabels[kind]}
                            </label>
                        ))}
                    </div>
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
                            {form.processing ? <Spinner /> : <ScanSearch className="size-4" />}
                            Consultar
                        </Button>
                    </div>
                    <InputError message={form.errors.dnis} className="mt-2" />
                    {exportError ? (
                        <p className="mt-2 text-sm text-red-700">{exportError}</p>
                    ) : null}
                    {truncated ? (
                        <p className="mt-2 text-sm text-amber-800">
                            Se consultaron los primeros 400 DNI.
                        </p>
                    ) : null}
                </form>

                {summary ? (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
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
                        El resultado queda en una fila por conductor. Abre el
                        detalle para ver cada inducción y abrir o descargar sus
                        PDFs.
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
                                    <div className="flex flex-wrap gap-2">
                                        {row.found ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                disabled={exporting}
                                                onClick={() => download([row], false)}
                                                className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                            >
                                                <Download className="size-4" />
                                                Este conductor
                                            </Button>
                                        ) : null}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            aria-expanded={open}
                                            onClick={() =>
                                                setOpenKey(open ? null : row.key)
                                            }
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
                                </div>

                                {open ? (
                                    <Detail
                                        row={row}
                                        selected={selected}
                                        onToggle={(inductionId, checked) =>
                                            setSelected((current) => ({
                                                ...current,
                                                [itemKey(row.key, inductionId)]:
                                                    checked,
                                            }))
                                        }
                                        onOpen={openDoc}
                                    />
                                ) : null}
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
    selected,
    onToggle,
    onOpen,
}: {
    row: DriverRow;
    selected: Record<string, boolean>;
    onToggle: (inductionId: number, checked: boolean) => void;
    onOpen: (dni: string, inductionId: number, doc: DocKind) => void;
}) {
    if (!row.found) {
        return (
            <div className="border-t border-[#e2eaf3] px-4 py-4 text-sm text-[#5a7390]">
                Este DNI no figura en inducciones, capacitaciones ni otras
                actividades.
            </div>
        );
    }

    return (
        <div className="border-t border-[#e2eaf3] px-4 py-4">
            <h3 className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                Actividades
            </h3>
            <ul className="mt-2 space-y-2">
                {row.inductions.map((induction) => {
                    const checked =
                        selected[itemKey(row.key, induction.id)] !== false;

                    return (
                        <li
                            key={induction.id}
                            className="rounded-xl border border-[#e2eaf3] px-3 py-2"
                        >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <label className="flex min-w-0 cursor-pointer items-start gap-2">
                                    <Checkbox
                                        checked={checked}
                                        onCheckedChange={(state) =>
                                            onToggle(induction.id, state === true)
                                        }
                                        className="mt-0.5 border-[#c5d5e6] data-[state=checked]:border-[#2e5a9e] data-[state=checked]:bg-[#2e5a9e]"
                                    />
                                    <span>
                                        <span className="block text-sm font-medium text-[#1a2b4c]">
                                            {induction.title}
                                        </span>
                                        <span className="mt-0.5 block text-xs text-[#5a7390]">
                                            {induction.activity_label || 'Actividad'}
                                            {induction.date
                                                ? ` · ${induction.date}`
                                                : ''}
                                            {induction.acta
                                                ? ` · Acta ${induction.acta}`
                                                : ''}
                                            {` · ${induction.status}`}
                                            {` · ${induction.attendance}`}
                                            {induction.signed
                                                ? ' · Firmó'
                                                : ' · Sin firma'}
                                            {induction.location
                                                ? ` · ${induction.location}`
                                                : ''}
                                        </span>
                                    </span>
                                </label>
                                <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                    {(Object.keys(docLabels) as DocKind[]).map(
                                        (doc) => (
                                            <Button
                                                key={doc}
                                                type="button"
                                                variant="outline"
                                                onClick={() =>
                                                    onOpen(row.key, induction.id, doc)
                                                }
                                                className="h-8 cursor-pointer border-[#c5d5e6] px-2 text-xs text-[#1a2b4c]"
                                            >
                                                <FileText className="size-3.5" />
                                                Ver {doc === 'acta' ? 'acta' : doc.toUpperCase()}
                                            </Button>
                                        ),
                                    )}
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ul>
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
