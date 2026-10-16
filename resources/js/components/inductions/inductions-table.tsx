import {
    Copy,
    FileText,
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
import { DateRangeFilter } from '@/components/shared/date-range-filter';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import type { FormOption } from '@/components/inductions/induction-form-fields';
import { useCan } from '@/hooks/use-can';
import { isBrowserOnline } from '@/lib/offline/ids';
import { openInductionPdf } from '@/lib/open-induction-pdf';
import { asPaginated } from '@/lib/paginated';
import { toast } from 'sonner';

export type InductionAttendeePreview = {
    id: number;
    driver_name: string;
    driver_dni?: string | null;
    plate_number?: string | null;
    status: string;
};

export type InductionItem = {
    id: number | string;
    pending_sync?: boolean;
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
    site_id?: number | null;
    department?: string | null;
    area?: string | null;
    section?: string | null;
    zone?: string | null;
    place_id?: number | null;
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
    activity?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    sort: 'title' | 'scheduled_at' | 'status' | 'created_at' | 'attendees_count';
    direction: 'asc' | 'desc';
    per_page: number;
};

export type StatusOption = { value: string; label: string };

type Props = {
    inductions: InductionsPagination;
    filters: InductionsFilters;
    statusOptions: StatusOption[];
    activityOptions: FormOption[];
    onEdit: (induction: InductionItem) => void;
    onDelete: (induction: InductionItem) => void;
    onCopy: (induction: InductionItem) => void;
    onViewAttendees: (induction: InductionItem) => void;
    onOpen: (induction: InductionItem) => void;
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

function nextInduction(induction: InductionItem): {
    label: string;
    hint: string;
    tone: 'ok' | 'soon' | 'late';
} | null {
    const raw = induction.session_date || induction.scheduled_at;
    const match = raw?.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (!match) {
        return null;
    }

    const start = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
    );
    const next = new Date(start);
    next.setFullYear(next.getFullYear() + 1);
    const days = Math.ceil((next.getTime() - Date.now()) / 86_400_000);
    const label = next
        .toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        .replace(/\./g, '')
        .replace(/[\u00a0\u202f\u2009]/g, ' ');

    if (days < 0) {
        return { label, hint: 'Vencida · duraba 1 año', tone: 'late' };
    }

    if (days <= 30) {
        return { label, hint: 'Por vencer · vigencia 1 año', tone: 'soon' };
    }

    return { label, hint: 'Vigencia 1 año', tone: 'ok' };
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
    onCopy,
    onOpen,
}: {
    induction: InductionItem;
    onEdit: (induction: InductionItem) => void;
    onDelete: (induction: InductionItem) => void;
    onCopy: (induction: InductionItem) => void;
    onOpen: (induction: InductionItem) => void;
}) {
    const { can } = useCan();
    const canUpdate = can('inductions.update');
    const canDelete = can('inductions.delete');
    const canCopy = can('inductions.duplicate') && induction.status === 'closed';
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

    if (induction.pending_sync) {
        return (
            <RowActionsMenu
                label={`Acciones de ${induction.title}`}
                items={[
                    canUpdate
                        ? {
                              key: 'edit',
                              label: 'Editar',
                              icon: Pencil,
                              onSelect: () => onEdit(induction),
                          }
                        : null,
                    canDelete
                        ? {
                              key: 'delete',
                              label: 'Eliminar',
                              icon: Trash2,
                              tone: 'danger' as const,
                              onSelect: () => onDelete(induction),
                          }
                        : null,
                ].filter((item): item is NonNullable<typeof item> =>
                    Boolean(item),
                )}
            />
        );
    }

    return (
        <RowActionsMenu
            label={`Acciones de ${induction.title}`}
            items={[
                {
                    key: 'attendees',
                    label: 'Asistentes',
                    icon: UserRoundPlus,
                    onSelect: () => onOpen(induction),
                },
                canCopy
                    ? {
                          key: 'copy',
                          label: 'Copiar',
                          icon: Copy,
                          onSelect: () => onCopy(induction),
                      }
                    : null,
                induction.status === 'closed'
                    ? {
                          key: 'pdf',
                          label: 'Ver documentos',
                          icon: FileText,
                          onSelect: () => {
                              void openInductionPdf(induction.id);
                          },
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

function matchingAttendees(
    induction: InductionItem,
    search: string,
): InductionAttendeePreview[] {
    const needle = search.trim().toLowerCase();

    if (needle.length < 2) {
        return [];
    }

    return (induction.attendees ?? []).filter((attendee) => {
        const name = (attendee.driver_name ?? '').toLowerCase();
        const dni = (attendee.driver_dni ?? '').toLowerCase();
        const plate = (attendee.plate_number ?? '').toLowerCase();

        return (
            name.includes(needle) ||
            dni.includes(needle) ||
            plate.includes(needle)
        );
    });
}

export function InductionsTable({
    inductions,
    filters,
    statusOptions,
    activityOptions,
    onEdit,
    onDelete,
    onCopy,
    onViewAttendees,
    onOpen,
}: Props) {
    const visit = useCallback(
        (params: Partial<InductionsFilters> & { page?: number }) => {
            if (!isBrowserOnline()) {
                toast.info(
                    'Sin conexión. Los filtros se habilitan al reconectar.',
                );

                return;
            }

            const nextStatus = Object.prototype.hasOwnProperty.call(
                params,
                'status',
            )
                ? params.status
                : filters.status;
            const nextActivity = Object.prototype.hasOwnProperty.call(
                params,
                'activity',
            )
                ? params.activity
                : filters.activity;
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

            router.get(
                '/inducciones',
                {
                    search: params.search ?? filters.search,
                    ...(nextStatus ? { status: nextStatus } : {}),
                    ...(nextActivity ? { activity: nextActivity } : {}),
                    ...(nextFrom ? { date_from: nextFrom } : {}),
                    ...(nextTo ? { date_to: nextTo } : {}),
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
            { value: 'all', label: 'Todos los estados', tone: 'default' },
            ...statusOptions.map((option) => ({
                value: option.value,
                label: option.label,
                tone: statusVariant(option.value),
            })),
        ],
        [statusOptions],
    );

    const activityChips = useMemo<FilterChip<string>[]>(
        () => [
            { value: 'all', label: 'Todas las actividades', tone: 'default' },
            ...activityOptions.map((option, index) => ({
                value: option.value,
                label: option.label,
                tone: (
                    ['info', 'success', 'warning', 'danger', 'muted'] as const
                )[index % 5],
            })),
        ],
        [activityOptions],
    );

    const activityLabel = (value?: string | null) =>
        activityOptions.find((option) => option.value === value)?.label ??
        value ??
        '';

    const columns = useMemo<DataTableColumn<InductionItem>[]>(
        () => [
            {
                key: 'title',
                header: 'Inducción',
                sortable: true,
                cell: (induction) => {
                    const matches = matchingAttendees(
                        induction,
                        filters.search,
                    );

                    return (
                        <div className="flex min-w-0 flex-col leading-tight">
                            <span className="truncate text-sm font-semibold text-foreground">
                                {induction.title}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">
                                {activityLabel(induction.activity)}
                                {induction.location
                                    ? ` · ${induction.location}`
                                    : ''}
                            </span>
                            {matches.length > 0 ? (
                                <span className="mt-0.5 truncate text-[11px] text-[#2e5a9e]">
                                    {matches
                                        .slice(0, 2)
                                        .map((attendee) => {
                                            const dni = attendee.driver_dni
                                                ? ` · DNI ${attendee.driver_dni}`
                                                : '';

                                            return `${attendee.driver_name}${dni}`;
                                        })
                                        .join(' · ')}
                                    {matches.length > 2
                                        ? ` +${matches.length - 2}`
                                        : ''}
                                </span>
                            ) : null}
                        </div>
                    );
                },
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
                key: 'next_on',
                header: 'Próxima',
                cell: (induction) => {
                    const next = nextInduction(induction);

                    if (!next) {
                        return (
                            <span className="text-xs text-muted-foreground">
                                —
                            </span>
                        );
                    }

                    return (
                        <div className="flex flex-col leading-tight">
                            <span
                                className={
                                    next.tone === 'late'
                                        ? 'text-xs font-semibold text-[#b91c1c]'
                                        : next.tone === 'soon'
                                          ? 'text-xs font-semibold text-[#8a5a12]'
                                          : 'text-xs font-medium text-[#1a2b4c]'
                                }
                            >
                                {next.label}
                            </span>
                            <span className="text-[10px] text-[#6b8ead]">
                                {next.hint}
                            </span>
                        </div>
                    );
                },
            },
            {
                key: 'status',
                header: 'Estado',
                sortable: true,
                cell: (induction) => (
                    <StatBadge
                        label={
                            induction.pending_sync
                                ? 'En dispositivo'
                                : statusLabel(induction.status, statusOptions)
                        }
                        value=""
                        variant={
                            induction.pending_sync
                                ? 'warning'
                                : statusVariant(induction.status)
                        }
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
                            onCopy={onCopy}
                            onOpen={onOpen}
                        />
                    </div>
                ),
            },
        ],
        [
            activityOptions,
            filters.search,
            onCopy,
            onDelete,
            onEdit,
            onOpen,
            onViewAttendees,
            statusOptions,
        ],
    );

    const hasFilters = Boolean(
        filters.search ||
            filters.status ||
            filters.activity ||
            filters.date_from ||
            filters.date_to,
    );

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
                    placeholder="Buscar tema, conductor o DNI..."
                >
                    <FilterChips
                        ariaLabel="Filtrar por actividad"
                        value={filters.activity || 'all'}
                        onChange={(value) =>
                            visit({
                                activity: value === 'all' ? null : value,
                                page: 1,
                            })
                        }
                        options={activityChips}
                    />
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
                        activity: filters.activity || undefined,
                        date_from: filters.date_from || undefined,
                        date_to: filters.date_to || undefined,
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
