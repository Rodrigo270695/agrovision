import {
    FileDown,
    GraduationCap,
    Lock,
    Pencil,
    Play,
    RotateCcw,
    Trash2,
    UserRoundPlus,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
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
} from '@/components/data-page';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { useCan } from '@/hooks/use-can';
import { asPaginated } from '@/lib/paginated';

export type InductionAttendeePreview = {
    id: number;
    driver_name: string;
    driver_dni?: string | null;
    plate_number?: string | null;
    status: string;
};

export type InductionItem = {
    id: number;
    acta_number?: string | null;
    document_code?: string | null;
    document_revision?: string | null;
    document_date?: string | null;
    risst_code?: string | null;
    risst_revision?: string | null;
    risst_date?: string | null;
    risst_approval_date?: string | null;
    risst_version?: string | null;
    title: string;
    temario?: string | null;
    activity?: string | null;
    corrective_action?: boolean;
    modality?: string | null;
    school?: string | null;
    categories?: string[] | null;
    category_other?: string | null;
    session_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    estimated_minutes?: number | null;
    sede?: string | null;
    department?: string | null;
    area?: string | null;
    section?: string | null;
    zone?: string | null;
    target_group?: string | null;
    crop?: string | null;
    org_unit?: string | null;
    speaker_name?: string | null;
    speaker_institution?: string | null;
    scheduled_at: string;
    location?: string | null;
    notes?: string | null;
    status: string;
    period_id?: number | null;
    created_by?: number | null;
    closed_at?: string | null;
    attendees_count?: number;
    attended_count?: number;
    attendees?: InductionAttendeePreview[];
    period?: { id: number; name: string } | null;
    creator?: { id: number; name: string } | null;
    created_at?: string | null;
};

export type InductionsPagination = {
    data: InductionItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type InductionsFilters = {
    search: string;
    status?: string | null;
    sort: 'title' | 'scheduled_at' | 'status' | 'created_at' | 'attendees_count';
    direction: 'asc' | 'desc';
    per_page: number;
};

export type StatusOption = { value: string; label: string };

type Props = {
    inductions: InductionsPagination;
    filters: InductionsFilters;
    statusOptions: StatusOption[];
    onEdit: (induction: InductionItem) => void;
    onDelete: (induction: InductionItem) => void;
    onViewAttendees: (induction: InductionItem) => void;
};

function formatDateTime(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    // Normaliza espacios Unicode (p. m. del Intl) para evitar mismatch de hidratación.
    return date
        .toLocaleString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        .replace(/\./g, '')
        .replace(/[\u00a0\u202f\u2009]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function statusLabel(status: string, options: StatusOption[]): string {
    return options.find((item) => item.value === status)?.label ?? status;
}

function canStartBySchedule(scheduledAt?: string | null): boolean {
    if (!scheduledAt) {
        return false;
    }

    const at = new Date(scheduledAt);

    if (Number.isNaN(at.getTime())) {
        return false;
    }

    return Date.now() >= at.getTime();
}

function UnitActions({
    induction,
    onEdit,
    onDelete,
}: {
    induction: InductionItem;
    onEdit: (induction: InductionItem) => void;
    onDelete: (induction: InductionItem) => void;
}) {
    const { can } = useCan();
    const canUpdate = can('inductions.update');
    const canDelete = can('inductions.delete');
    const locked =
        induction.status === 'closed' || induction.status === 'cancelled';
    const canStart =
        induction.status === 'scheduled' &&
        canStartBySchedule(induction.scheduled_at);

    const patchStatus = (status: string) => {
        if (!canUpdate) {
            return;
        }

        router.patch(
            `/inducciones/${induction.id}/estado`,
            { status },
            { preserveScroll: true },
        );
    };

    return (
        <RowActionsMenu
            label={`Acciones de ${induction.title}`}
            items={[
                {
                    key: 'attendees',
                    label: 'Asistentes',
                    icon: UserRoundPlus,
                    onSelect: () =>
                        router.visit(`/inducciones/${induction.id}`),
                },
                induction.status === 'closed'
                    ? {
                          key: 'pdf',
                          label: 'Descargar documentos',
                          icon: FileDown,
                          href: `/inducciones/${induction.id}/pdf`,
                      }
                    : null,
                canUpdate && !locked
                    ? {
                          key: 'edit',
                          label: 'Editar',
                          icon: Pencil,
                          onSelect: () => onEdit(induction),
                      }
                    : null,
                canUpdate && canStart
                    ? {
                          key: 'start',
                          label: 'Iniciar',
                          icon: Play,
                          tone: 'warning' as const,
                          onSelect: () => patchStatus('in_progress'),
                      }
                    : null,
                canUpdate && induction.status === 'in_progress'
                    ? {
                          key: 'close',
                          label: 'Finalizar',
                          icon: Lock,
                          tone: 'success' as const,
                          onSelect: () => patchStatus('closed'),
                      }
                    : null,
                canUpdate && locked
                    ? {
                          key: 'reopen',
                          label: 'Reabrir',
                          icon: RotateCcw,
                          onSelect: () => patchStatus('scheduled'),
                      }
                    : null,
                canDelete && induction.status !== 'closed'
                    ? {
                          key: 'delete',
                          label: 'Eliminar',
                          icon: Trash2,
                          tone: 'danger' as const,
                          separatorBefore: true,
                          onSelect: () => onDelete(induction),
                      }
                    : null,
            ].filter((item): item is NonNullable<typeof item> => Boolean(item))}
        />
    );
}

function statusVariant(
    status: string,
): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
    if (status === 'closed') {
        return 'success';
    }

    if (status === 'in_progress' || status === 'scheduled') {
        return status === 'scheduled' ? 'info' : 'warning';
    }

    if (status === 'cancelled') {
        return 'danger';
    }

    return 'muted';
}

export function InductionsTable({
    inductions,
    filters,
    statusOptions,
    onEdit,
    onDelete,
    onViewAttendees,
}: Props) {
    const visit = useCallback(
        (params: Partial<InductionsFilters> & { page?: number }) => {
            const nextStatus = Object.prototype.hasOwnProperty.call(
                params,
                'status',
            )
                ? params.status
                : filters.status;

            router.get(
                '/inducciones',
                {
                    search: params.search ?? filters.search,
                    ...(nextStatus ? { status: nextStatus } : {}),
                    sort: params.sort ?? filters.sort,
                    direction: params.direction ?? filters.direction,
                    per_page: params.per_page ?? filters.per_page,
                    page: params.page ?? 1,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                },
            );
        },
        [filters],
    );

    const sort: SortState | null = filters.sort
        ? { key: filters.sort, direction: filters.direction }
        : null;

    const chipOptions = useMemo<FilterChip<string>[]>(
        () => [
            { value: 'all', label: 'Todos', tone: 'default' },
            ...statusOptions.map((option) => ({
                value: option.value,
                label: option.label,
                tone: statusVariant(option.value),
            })),
        ],
        [statusOptions],
    );

    const columns = useMemo<DataTableColumn<InductionItem>[]>(
        () => [
            {
                key: 'title',
                header: 'Inducción',
                sortable: true,
                cell: (induction) => (
                    <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {induction.title}
                        </span>
                        <span className="truncate font-mono text-xs text-muted-foreground">
                            {induction.document_code || 'Sin código'}
                            {induction.location ? ` · ${induction.location}` : ''}
                        </span>
                    </div>
                ),
            },
            {
                key: 'scheduled_at',
                header: 'Fecha / hora',
                sortable: true,
                cell: (induction) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDateTime(induction.scheduled_at)}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Estado',
                sortable: true,
                cell: (induction) => (
                    <StatBadge
                        label={statusLabel(induction.status, statusOptions)}
                        value=""
                        variant={statusVariant(induction.status)}
                    />
                ),
            },
            {
                key: 'attendees_count',
                header: 'Asistentes',
                sortable: true,
                cell: (induction) => (
                    <button
                        type="button"
                        onClick={() => onViewAttendees(induction)}
                        className="cursor-pointer text-xs font-medium text-[#2e5a9e] underline-offset-2 hover:underline"
                        title="Ver asistentes"
                    >
                        {induction.attended_count ?? 0}/
                        {induction.attendees_count ?? 0}
                    </button>
                ),
            },
            {
                key: 'period',
                header: 'Periodo',
                cell: (induction) => (
                    <span className="text-xs text-muted-foreground">
                        {induction.period?.name || '—'}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-12',
                cell: (induction) => (
                    <div className="flex justify-end">
                        <UnitActions
                            induction={induction}
                            onEdit={onEdit}
                            onDelete={onDelete}
                        />
                    </div>
                ),
            },
        ],
        [onDelete, onEdit, onViewAttendees, statusOptions],
    );

    const hasFilters = Boolean(filters.search || filters.status);

    return (
        <DataTable
            columns={columns}
            data={inductions.data}
            rowKey={(induction) => induction.id}
            sort={sort}
            onSortChange={(next) => {
                if (!next) {
                    visit({ sort: 'scheduled_at', direction: 'desc', page: 1 });
                    return;
                }

                visit({
                    sort: next.key as InductionsFilters['sort'],
                    direction: next.direction,
                    page: 1,
                });
            }}
            ariaLiveMessage={`${inductions.total} inducciones encontradas`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar título o lugar..."
                >
                    <FilterChips
                        ariaLabel="Filtrar por estado"
                        value={filters.status || 'all'}
                        onChange={(value) =>
                            visit({
                                status: value === 'all' ? null : value,
                                page: 1,
                            })
                        }
                        options={chipOptions}
                    />
                </DataToolbar>
            }
            footer={
                <DataPagination
                    meta={asPaginated(inductions, '/inducciones')}
                    onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
                    preservedQuery={{
                        search: filters.search || undefined,
                        per_page: filters.per_page,
                        sort: filters.sort,
                        direction: filters.direction,
                        status: filters.status || undefined,
                    }}
                />
            }
            emptyState={
                <EmptyState
                    icon={GraduationCap}
                    title={
                        hasFilters
                            ? 'Sin resultados'
                            : 'Aún no hay inducciones'
                    }
                    description={
                        hasFilters
                            ? 'Prueba con otro filtro o limpia la búsqueda.'
                            : 'Programa la primera charla o inducción SST.'
                    }
                />
            }
        />
    );
}
