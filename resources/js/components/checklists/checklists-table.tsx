import { ArrowRightLeft, Ban, Check, ClipboardCheck, Clock, FileDown, FilePenLine, Pencil, Trash2 } from 'lucide-react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { formatDaysSince } from '@/lib/document-expiry';
import { router, usePage } from '@inertiajs/react';
import { useCallback, useMemo, useState } from 'react';
import {
    DriverBlacklistModal,
    type DriverBlacklistDraft,
} from '@/components/drivers/driver-blacklist-modal';
import { ChecklistTransferModal } from '@/components/checklists/checklist-transfer-modal';
import type { Auth } from '@/types';
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import { toast } from 'sonner';
import { isBrowserOnline } from '@/lib/offline/ids';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    FilterChips,
    StatBadge,
    type DataTableColumn,
    type FilterChip,
    type SortState,
    type StatBadgeVariant,
} from '@/components/data-page';
import {
    RowActionsMenu,
    type RowActionItem,
} from '@/components/shared/row-actions-menu';
import { useCan } from '@/hooks/use-can';
import { asPaginated } from '@/lib/paginated';
import {
    inspectionGrade,
    inspectionGradeLabel,
    type InspectionGrade,
} from '@/lib/pareto-grade';

export type ChecklistObservation = {
    id: number;
    number?: string | null;
    label: string;
    group?: string | null;
    note?: string | null;
};

export type ChecklistRoundItem = {
    id: number;
    number?: string | null;
    label: string;
    group?: string | null;
    value?: 'yes' | 'no' | '';
    status: 'open' | 'yes' | 'cleared';
};

export type ChecklistRound = {
    number: number;
    items: ChecklistRoundItem[];
};

export type ChecklistItemRow = {
    id: number | string;
    pending_sync?: boolean;
    plate_number: string;
    created_by?: number | null;
    creator?: { id: number; name: string } | null;
    sede?: string | null;
    lugar?: string | null;
    driver_name?: string | null;
    driver_dni?: string | null;
    provider?: string | null;
    status: 'draft' | 'completed';
    sealed_at?: string | null;
    first_result?: 'approved' | 'rejected' | null;
    round_number?: number | null;
    first_pareto_percent?: number | null;
    first_has_no?: boolean | null;
    rounds?: number | null;
    items_yes?: number | null;
    observations?: ChecklistObservation[];
    round_history?: ChecklistRound[];
    second_result?: 'approved' | 'rejected' | null;
    second_pareto_percent?: number | null;
    second_has_no?: boolean | null;
    edit_first?: 'pending' | 'approved' | null;
    edit_second?: 'pending' | 'approved' | null;
    coordinator_status?: 'observed' | 'reviewed' | null;
    created_at?: string | null;
    first_inspected_on?: string | null;
    first_inspected_time?: string | null;
    template?: {
        id: number;
        type: string;
        code: string;
        name: string;
    } | null;
    period?: {
        id: number;
        name: string;
        date?: string;
        status?: string;
    } | null;
};

export type ChecklistsPagination = {
    data: ChecklistItemRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type ChecklistsFilters = {
    search: string;
    template_type?: string | null;
    status?: 'draft' | 'completed' | null;
    date_from?: string | null;
    date_to?: string | null;
    inspector_id?: number | null;
    sort: 'plate_number' | 'created_at' | 'first_inspected_on' | 'status' | 'first_result';
    direction: 'asc' | 'desc';
    per_page: number;
    batch_id?: number | null;
};

type Props = {
    checklists: ChecklistsPagination;
    filters: ChecklistsFilters;
    templateOptions?: { value: string; label: string }[];
    inspectors?: { id: number; name: string }[];
    onEdit: (item: ChecklistItemRow, pass?: 'first' | 'second') => void;
    onDelete: (item: ChecklistItemRow) => void;
    onPreviewPdf: (item: ChecklistItemRow) => void;
};

type SortKey = ChecklistsFilters['sort'];
type TypeFilter = string;
type StatusFilter = 'all' | 'draft' | 'completed';

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const day = value.slice(0, 10);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
    const date = match
        ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
        : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date
        .toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        .replace('.', '');
}

function formatInspectionTime(value?: string | null): string | null {
    if (!value) {
        return null;
    }

    const match = /^(\d{2}):(\d{2})/.exec(value);

    return match ? `${match[1]}:${match[2]}` : null;
}

function ResultChip({
    value,
    percent,
    hasNo,
}: {
    value?: string | null;
    percent?: number | null;
    hasNo?: boolean | null;
}) {
    const grade = inspectionGrade(value, percent, hasNo);
    const variant: Record<InspectionGrade, StatBadgeVariant> = {
        pending: 'muted',
        rejected: 'danger',
        approved_notes: 'warning',
        approved: 'success',
    };

    return (
        <StatBadge
            label={inspectionGradeLabel(grade)}
            value=""
            variant={variant[grade]}
        />
    );
}

function ResultLegend() {
    return (
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-muted-foreground">
            <span className="font-medium text-brand-700">Leyenda Pareto:</span>
            <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500" />
                Desaprobado (&lt; 85%)
            </span>
            <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                Aprobado c/ obs. (85%–99% o algún ítem en NO)
            </span>
            <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-600" />
                Aprobado (100%, todos SÍ)
        </span>
        </div>
    );
}

function ObservationPreview({
    item,
    onOpen,
}: {
    item: ChecklistItemRow;
    onOpen: () => void;
}) {
    const observations = item.observations ?? [];
    const preview = observations.slice(0, 2);

    return (
        <button
            type="button"
            onClick={onOpen}
            className="flex max-w-56 cursor-pointer flex-col items-start gap-0.5 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            aria-label={
                observations.length === 0
                    ? `Ver ítems de ${item.plate_number}. Sin observaciones`
                    : `Ver ${observations.length} observaciones de ${item.plate_number}`
            }
        >
            {observations.length === 0 ? (
                <span className="text-xs text-slate-500">Sin observaciones</span>
            ) : (
                preview.map((observation) => (
                    <span
                        key={observation.id}
                        className="max-w-full truncate text-xs text-slate-700"
                    >
                        {observation.number ? `${observation.number} ` : ''}
                        {observation.label}
                    </span>
                ))
            )}
            <span className="text-xs font-semibold whitespace-nowrap text-brand-700">
                Ver rondas
            </span>
        </button>
    );
}

function ObservationDetailModal({
    item,
    onClose,
}: {
    item: ChecklistItemRow | null;
    onClose: () => void;
}) {
    const history =
        item?.round_history && item.round_history.length > 0
            ? item.round_history
            : [
                  {
                      number: 1,
                      items: (item?.observations ?? []).map((observation) => ({
                          id: observation.id,
                          number: observation.number,
                          label: observation.label,
                          group: observation.group,
                          value: 'no' as const,
                          status: 'open' as const,
                      })),
                  },
              ];
    const itemKey = item?.id ?? 'none';
    const [selection, setSelection] = useState({ key: itemKey, number: 1 });
    if (selection.key !== itemKey) {
        setSelection({ key: itemKey, number: 1 });
    }
    const round =
        history.find((entry) => entry.number === selection.number) ??
        history[0];
    const roundItems = round?.items ?? [];
    const openItems = roundItems.filter(
        (entry) => (entry.value ?? (entry.status === 'open' ? 'no' : 'yes')) === 'no',
    );
    const yesItems = roundItems.filter(
        (entry) => (entry.value ?? (entry.status === 'open' ? 'no' : 'yes')) === 'yes',
    );
    const finished = openItems.length === 0 && yesItems.length > 0;

    return (
        <AppModal
            open={item !== null}
            onClose={onClose}
            title={item ? `Rondas · ${item.plate_number}` : 'Rondas'}
            description={
                item
                    ? `${item.driver_name || 'Sin conductor'}. Cada ronda muestra el checklist completo, con lo que estaba en SÍ y en NO.`
                    : undefined
            }
            className="sm:max-w-2xl"
            footer={
                <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer rounded-xl"
                    onClick={onClose}
                >
                    Cerrar
                </Button>
            }
        >
            {item && round ? (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <ResultChip
                            value={item.first_result}
                            percent={item.first_pareto_percent}
                            hasNo={item.first_has_no}
                        />
                        <span className="text-sm font-semibold tabular-nums text-slate-700">
                            {item.first_pareto_percent != null
                                ? `${item.first_pareto_percent}%`
                                : 'Sin puntaje'}
                        </span>
                    </div>
                    <div
                        className="flex gap-2 overflow-x-auto pb-1"
                        role="tablist"
                        aria-label="Rondas de la inspección"
                    >
                        {history.map((entry) => {
                            const pending = entry.items.filter(
                                (row) => row.status === 'open',
                            ).length;
                            const active = entry.number === round.number;
                            const done = pending === 0 && entry.number > 1;

                            return (
                                <button
                                    key={entry.number}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() =>
                                        setSelection({
                                            key: itemKey,
                                            number: entry.number,
                                        })
                                    }
                                    className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${
                                        active
                                            ? 'bg-brand-700 text-white ring-brand-700'
                                            : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                                    }`}
                                >
                                    <span
                                        className={`inline-flex size-4 items-center justify-center rounded-full ${
                                            active
                                                ? 'bg-white/20'
                                                : done
                                                  ? 'bg-emerald-100 text-emerald-700'
                                                  : 'bg-slate-100 text-slate-500'
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {done ? (
                                            <Check className="size-3" />
                                        ) : (
                                            entry.number
                                        )}
                                    </span>
                                    {entry.number === 1
                                        ? 'Ronda 1'
                                        : `Ronda ${entry.number}`}
                                    <span className={active ? 'text-white/80' : 'font-medium text-slate-500'}>
                                        {pending === 0
                                            ? 'sin observaciones'
                                            : `${pending} en NO`}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-sm text-slate-600">
                        {yesItems.length} en SÍ · {openItems.length} en NO.
                        {finished
                            ? ' Esta ronda llegó al 100 %.'
                            : ' El checklist completo de esta inspección queda guardado.'}
                    </p>
                    <ul className="space-y-2">
                        {roundItems.map((entry) => {
                            const value =
                                entry.value ??
                                (entry.status === 'open' ? 'no' : 'yes');
                            const isYes = value === 'yes';

                            return (
                                <li
                                    key={`${round.number}-${entry.id}`}
                                    className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                                >
                                    <span
                                        className={`mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded border ${
                                            isYes
                                                ? 'border-emerald-600 bg-emerald-600 text-white'
                                                : 'border-rose-300 bg-white'
                                        }`}
                                        aria-hidden="true"
                                    >
                                        {isYes ? <Check className="size-3.5" /> : null}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        {entry.group ? (
                                            <p className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
                                                {entry.group}
                                            </p>
                                        ) : null}
                                        <p className="text-sm font-semibold text-slate-800">
                                            {entry.number ? `${entry.number}. ` : ''}
                                            {entry.label}
                                        </p>
                                    </div>
                                    <span
                                        className={`shrink-0 text-xs font-semibold ${
                                            isYes ? 'text-emerald-700' : 'text-rose-700'
                                        }`}
                                    >
                                        {value === '' ? '—' : isYes ? 'SÍ' : 'NO'}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            ) : null}
        </AppModal>
    );
}

function decided(result?: 'approved' | 'rejected' | null): boolean {
    return result === 'approved' || result === 'rejected';
}

function closedPassAction(
    item: ChecklistItemRow,
    pass: 'first' | 'second',
    isSuperAdmin: boolean,
    onEdit: (item: ChecklistItemRow, pass?: 'first' | 'second') => void,
): RowActionItem {
    const label = pass === 'first' ? 'inspección' : '2da';
    const status = pass === 'first' ? item.edit_first : item.edit_second;

    if (isSuperAdmin || status === 'approved') {
        return {
            key: `edit-${pass}`,
            label: `Editar ${label}`,
            icon: Pencil,
            onSelect: () => onEdit(item, pass),
        };
    }

    if (status === 'pending') {
        return {
            key: `wait-${pass}`,
            label: `Esperando ${label}`,
            icon: Clock,
            disabled: true,
            onSelect: () => undefined,
        };
    }

    return {
        key: `ask-${pass}`,
        label: `Pedir editar ${label}`,
        icon: FilePenLine,
        onSelect: () => {
            router.post(
                `/inspecciones/${item.id}/solicitar-edicion`,
                { inspection_pass: pass },
                { preserveScroll: true },
            );
        },
    };
}

function editActions(
    item: ChecklistItemRow,
    sealed: boolean,
    canUpdate: boolean,
    isSuperAdmin: boolean,
    onEdit: (item: ChecklistItemRow, pass?: 'first' | 'second') => void,
): RowActionItem[] {
    if (!canUpdate && !sealed) {
        return [];
    }

    if (sealed || typeof item.id !== 'number') {
        return [
            {
                key: 'open',
                label: 'Ver',
                icon: Pencil,
                onSelect: () => onEdit(item),
            },
        ];
    }

    const firstClosed = decided(item.first_result);
    const actions: RowActionItem[] = [];

    if (!firstClosed) {
        actions.push({
            key: 'open',
            label: 'Editar',
            icon: Pencil,
            onSelect: () => onEdit(item),
        });

        return actions;
    }

    actions.push({
        ...closedPassAction(item, 'first', isSuperAdmin, onEdit),
        label:
            isSuperAdmin || item.edit_first === 'approved'
                ? 'Editar'
                : item.edit_first === 'pending'
                  ? 'Esperando edición'
                  : 'Pedir editar',
    });

    return actions;
}

export function ChecklistsTable({
    checklists,
    filters,
    templateOptions = [],
    inspectors = [],
    onEdit,
    onDelete,
    onPreviewPdf,
}: Props) {
    const { can, isSuperAdmin, roles } = useCan();
    const { auth } = usePage().props as { auth: Auth };
    const currentUserId = auth.user?.id;
    const isSupport = Boolean(auth.is_support);
    const isCoordinator = roles.some(
        (role) => role.toLowerCase() === 'coordinador',
    );
    const [blacklistDraft, setBlacklistDraft] =
        useState<DriverBlacklistDraft | null>(null);
    const [transferring, setTransferring] = useState<ChecklistItemRow | null>(
        null,
    );
    const [detail, setDetail] = useState<ChecklistItemRow | null>(null);

    const visit = useCallback(
        (params: Partial<ChecklistsFilters> & { page?: number; batch_id?: number | null }) => {
            if (!isBrowserOnline()) {
                toast.info(
                    'Sin conexión. Los filtros se habilitan al reconectar.',
                );

                return;
            }

            const nextType = Object.prototype.hasOwnProperty.call(
                params,
                'template_type',
            )
                ? params.template_type
                : filters.template_type;
            const nextStatus = Object.prototype.hasOwnProperty.call(
                params,
                'status',
            )
                ? params.status
                : filters.status;
            const nextFrom = Object.prototype.hasOwnProperty.call(
                params,
                'date_from',
            )
                ? params.date_from
                : filters.date_from;
            const nextTo = Object.prototype.hasOwnProperty.call(
                params,
                'date_to',
            )
                ? params.date_to
                : filters.date_to;
            const nextInspector = Object.prototype.hasOwnProperty.call(
                params,
                'inspector_id',
            )
                ? params.inspector_id
                : filters.inspector_id;

            router.get(
                '/inspecciones',
                {
                    search: params.search ?? filters.search,
                    ...(nextType ? { template_type: nextType } : {}),
                    ...(nextStatus ? { status: nextStatus } : {}),
                    ...(nextFrom ? { date_from: nextFrom } : {}),
                    ...(nextTo ? { date_to: nextTo } : {}),
                    ...(nextInspector ? { inspector_id: nextInspector } : {}),
                    sort: params.sort ?? filters.sort,
                    direction: params.direction ?? filters.direction,
                    per_page: params.per_page ?? filters.per_page,
                    ...(params.page ? { page: params.page } : {}),
                },
                { preserveState: true, preserveScroll: true, replace: true },
            );
        },
        [filters],
    );

    const sort: SortState | null = filters.sort
        ? { key: filters.sort, direction: filters.direction }
        : null;

    const typeChips =
        templateOptions.length > 0
            ? templateOptions
            : [
                  { value: 'tdp', label: 'TDP' },
                  { value: 'tdc', label: 'TDC' },
              ];
    const typeTones = ['info', 'success', 'warning', 'danger'] as const;
    const typeOptions: readonly FilterChip<TypeFilter>[] = [
        { value: 'all', label: 'Todos los tipos', tone: 'default' },
        ...typeChips.map((template, index) => ({
            value: template.value,
            label: template.label,
            tone: typeTones[index % typeTones.length],
        })),
    ];

    const statusOptions: readonly FilterChip<StatusFilter>[] = [
        { value: 'all', label: 'Todos los estados', tone: 'default' },
        { value: 'draft', label: 'Borrador', tone: 'warning' },
        { value: 'completed', label: 'Completado', tone: 'success' },
    ];

    const columns = useMemo<DataTableColumn<ChecklistItemRow>[]>(
        () => [
            {
                key: 'plate_number',
                header: 'Placa',
                sortable: true,
                cell: (item) => (
                    <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {item.plate_number}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                            {item.driver_name || 'Sin conductor'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'sede',
                header: 'Sede',
                cell: (item) => (
                    <span className="text-xs text-muted-foreground">
                        {item.sede && item.sede !== '—' ? item.sede : '—'}
                    </span>
                ),
            },
            {
                key: 'lugar',
                header: 'Lugar',
                cell: (item) => (
                    <span className="text-xs text-muted-foreground">
                        {item.lugar && item.lugar !== '—' ? item.lugar : '—'}
                    </span>
                ),
            },
            {
                key: 'first_result',
                header: 'Resultado',
                sortable: true,
                cell: (item) => (
                    <div className="flex items-center gap-2">
                        <ResultChip
                            value={item.first_result}
                            percent={item.first_pareto_percent}
                            hasNo={item.first_has_no}
                        />
                        {item.first_pareto_percent != null ? (
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-600">
                                {item.first_pareto_percent}%
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'rounds',
                header: 'Rondas',
                cell: (item) => {
                    const rounds = Math.max(
                        1,
                        item.round_history?.length ??
                            item.rounds ??
                            item.round_number ??
                            1,
                    );

                    return (
                        <button
                            type="button"
                            onClick={() => setDetail(item)}
                            className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                            aria-label={`Ver ${rounds === 1 ? 'la inspección' : `${rounds} rondas`} de ${item.plate_number}`}
                        >
                            <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-800 ring-1 ring-brand-200">
                                {rounds}
                            </span>
                            <span className="text-xs font-semibold whitespace-nowrap text-brand-700">
                                {rounds === 1 ? 'Ver ronda' : 'Ver rondas'}
                            </span>
                        </button>
                    );
                },
            },
            {
                key: 'observations',
                header: 'Observaciones',
                cell: (item) => (
                    <ObservationPreview
                        item={item}
                        onOpen={() => setDetail(item)}
                    />
                ),
            },
            {
                key: 'first_inspected_on',
                header: 'Creado',
                sortable: true,
                cell: (item) => {
                    const time = formatInspectionTime(item.first_inspected_time);
                    const baseDate = item.first_inspected_on ?? item.created_at;

                    return (
                        <div className="text-xs tabular-nums">
                            <p className="text-muted-foreground">
                                {formatDate(baseDate)}
                                {time ? ` · ${time}` : ''}
                            </p>
                            <p className="font-semibold text-brand-700">
                                {formatDaysSince(baseDate)}
                            </p>
                        </div>
                    );
                },
            },
            {
                key: 'type',
                header: 'Tipo',
                cell: (item) => (
                    <span className="text-xs font-semibold uppercase text-brand-500">
                        {item.template?.type ?? '—'}
                    </span>
                ),
            },
            {
                key: 'period',
                header: 'Periodo',
                cell: (item) => (
                    <span className="text-xs text-muted-foreground">
                        {item.period?.name || '—'}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-12',
                cell: (item) => {
                    const sealed = Boolean(item.sealed_at);
                    const canPdf =
                        typeof item.id === 'number' &&
                        (item.first_result === 'approved' ||
                            item.first_result === 'rejected') &&
                        can('checklists.view');
                    const hasOtherInspector = inspectors.some(
                        (inspector) => inspector.id !== item.created_by,
                    );
                    const canTransfer =
                        can('checklists.transfer') &&
                        typeof item.id === 'number' &&
                        hasOtherInspector &&
                        (isSuperAdmin ||
                            isSupport ||
                            isCoordinator ||
                            item.created_by === currentUserId);

                    return (
                        <div className="flex justify-end">
                            <RowActionsMenu
                                label={`Acciones de ${item.plate_number}`}
                                items={[
                                    canPdf
                                        ? {
                                              key: 'pdf',
                                              label: 'Ver PDF',
                                              icon: FileDown,
                                              onSelect: () =>
                                                  onPreviewPdf(item),
                                          }
                                        : null,
                                    ...editActions(
                                        item,
                                        sealed,
                                        can('checklists.update'),
                                        isSuperAdmin,
                                        onEdit,
                                    ),
                                    canTransfer
                                        ? {
                                              key: 'transfer',
                                              label: 'Traspasar inspector',
                                              icon: ArrowRightLeft,
                                              separatorBefore: true,
                                              onSelect: () =>
                                                  setTransferring(item),
                                          }
                                        : null,
                                    can('driver_blacklists.create') &&
                                    item.driver_name &&
                                    typeof item.id === 'number'
                                        ? {
                                              key: 'blacklist',
                                              label: 'Lista negra',
                                              icon: Ban,
                                              separatorBefore: !canTransfer,
                                              onSelect: () =>
                                                  setBlacklistDraft({
                                                      driver_name:
                                                          item.driver_name || '',
                                                      driver_dni: item.driver_dni,
                                                      plate_number:
                                                          item.plate_number,
                                                      source: 'checklist',
                                                      unit_checklist_id: item.id,
                                                  }),
                                          }
                                        : null,
                                    can('checklists.delete') && !sealed
                                        ? {
                                              key: 'delete',
                                              label: 'Eliminar',
                                              icon: Trash2,
                                              tone: 'danger' as const,
                                              separatorBefore: true,
                                              onSelect: () => onDelete(item),
                                          }
                                        : null,
                                ].filter(
                                    (action): action is NonNullable<typeof action> =>
                                        Boolean(action),
                                )}
                            />
                        </div>
                    );
                },
            },
        ],
        [
            can,
            currentUserId,
            inspectors,
            isCoordinator,
            isSuperAdmin,
            isSupport,
            onDelete,
            onEdit,
            onPreviewPdf,
        ],
    );

    const hasFilters = Boolean(
        filters.search ||
            filters.template_type ||
            filters.status ||
            filters.date_from ||
            filters.date_to ||
            filters.inspector_id,
    );

    return (
        <>
        <DataTable
            columns={columns}
            data={checklists.data}
            rowKey={(item) => item.id}
            sort={sort}
            onSortChange={(next) => {
                if (!next) {
                    visit({
                        sort: 'first_inspected_on',
                        direction: 'desc',
                        page: 1,
                    });
                    return;
                }

                visit({
                    sort: next.key as SortKey,
                    direction: next.direction,
                    page: 1,
                });
            }}
            ariaLiveMessage={`${checklists.total} inspecciones encontradas`}
            toolbar={
                <div className="flex w-full flex-col gap-2">
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar placa, conductor..."
                >
                    <FilterChips
                        ariaLabel="Filtrar por tipo"
                        value={(filters.template_type ?? 'all') as TypeFilter}
                        onChange={(value) =>
                            visit({
                                template_type: value === 'all' ? null : value,
                                page: 1,
                            })
                        }
                        options={typeOptions}
                    />
                    <FilterChips
                        ariaLabel="Filtrar por estado"
                        value={(filters.status ?? 'all') as StatusFilter}
                        onChange={(value) =>
                            visit({
                                status:
                                    value === 'all'
                                        ? null
                                        : (value as 'draft' | 'completed'),
                                page: 1,
                            })
                        }
                        options={statusOptions}
                    />
                    <FilterChips
                        ariaLabel="Filtrar por inspector"
                        value={
                            filters.inspector_id
                                ? String(filters.inspector_id)
                                : 'all'
                        }
                        onChange={(value) =>
                            visit({
                                inspector_id:
                                    value === 'all' ? null : Number(value),
                                page: 1,
                            })
                        }
                        options={[
                            {
                                value: 'all',
                                label: 'Todos los inspectores',
                                tone: 'default',
                            },
                            ...inspectors.map((inspector) => ({
                                value: String(inspector.id),
                                label: inspector.name,
                            })),
                        ]}
                        className="min-w-44"
                    />
                    <DateRangeFilter
                        desde={filters.date_from ?? null}
                        hasta={filters.date_to ?? null}
                        onApply={(dateFrom, dateTo) =>
                            visit({
                                date_from: dateFrom,
                                date_to: dateTo,
                                page: 1,
                            })
                        }
                        onClear={() =>
                            visit({
                                date_from: null,
                                date_to: null,
                                page: 1,
                            })
                        }
                    />
                </DataToolbar>
                    <ResultLegend />
                </div>
            }
            footer={
                <DataPagination
                    meta={asPaginated(checklists, '/inspecciones')}
                    onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
                    preservedQuery={{
                        search: filters.search || undefined,
                        per_page: filters.per_page,
                        sort: filters.sort,
                        direction: filters.direction,
                        template_type: filters.template_type ?? undefined,
                        status: filters.status ?? undefined,
                        date_from: filters.date_from ?? undefined,
                        date_to: filters.date_to ?? undefined,
                        inspector_id: filters.inspector_id ?? undefined,
                    }}
                />
            }
            emptyState={
                <EmptyState
                    icon={ClipboardCheck}
                    title={
                        hasFilters
                            ? 'Sin resultados'
                            : 'Aún no hay inspecciones'
                    }
                    description={
                        hasFilters
                            ? 'Prueba con otro filtro o limpia la búsqueda.'
                            : 'Crea una inspección eligiendo la fecha y una unidad.'
                    }
                />
            }
        />
        <DriverBlacklistModal
            open={blacklistDraft !== null}
            draft={blacklistDraft}
            onClose={() => setBlacklistDraft(null)}
        />
        <ChecklistTransferModal
            open={transferring !== null}
            checklist={transferring}
            inspectors={inspectors}
            onClose={() => setTransferring(null)}
        />
        <ObservationDetailModal
            item={detail}
            onClose={() => setDetail(null)}
        />
        </>
    );
}
