import {
    FileDown,
    Lock,
    Pencil,
    Play,
    Trash2,
    UserRoundPlus,
    RotateCcw,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback } from 'react';
import { TablePagination } from '@/components/shared/table-pagination';
import { TableSearchFilter } from '@/components/shared/table-search-filter';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';

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

const statusTone: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    scheduled: 'bg-sky-50 text-sky-800',
    in_progress: 'bg-amber-50 text-amber-800',
    closed: 'bg-emerald-50 text-emerald-800',
    cancelled: 'bg-red-50 text-red-700',
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
    statusOptions,
    onEdit,
    onDelete,
    className,
}: {
    induction: InductionItem;
    statusOptions: StatusOption[];
    onEdit: (induction: InductionItem) => void;
    onDelete: (induction: InductionItem) => void;
    className?: string;
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
        <div className={cn('flex items-center gap-0.5', className)}>
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => router.visit(`/inducciones/${induction.id}`)}
                className="size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                aria-label={`Asistentes de ${induction.title}`}
                title="Conductores / asistencia"
            >
                <UserRoundPlus className="size-3.5" />
            </Button>

            {induction.status === 'closed' ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    asChild
                    className="size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                    title="Descargar documentos (ZIP)"
                >
                    <a href={`/inducciones/${induction.id}/pdf`}>
                        <FileDown className="size-3.5" />
                    </a>
                </Button>
            ) : null}

            {canUpdate && !locked ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(induction)}
                    className="size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                    aria-label={`Editar ${induction.title}`}
                >
                    <Pencil className="size-3.5" />
                </Button>
            ) : null}

            {canUpdate && canStart ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => patchStatus('in_progress')}
                    className="size-7 cursor-pointer text-amber-600 hover:bg-amber-50 hover:text-amber-800"
                    title="Iniciar inducción"
                >
                    <Play className="size-3.5" />
                </Button>
            ) : null}

            {canUpdate && induction.status === 'in_progress' ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => patchStatus('closed')}
                    className="size-7 cursor-pointer text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                    title="Finalizar inducción"
                >
                    <Lock className="size-3.5" />
                </Button>
            ) : null}

            {canUpdate && locked ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => patchStatus('scheduled')}
                    className="size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                    title="Reabrir"
                >
                    <RotateCcw className="size-3.5" />
                </Button>
            ) : null}

            {canDelete && induction.status !== 'closed' ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(induction)}
                    className="size-7 cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Eliminar ${induction.title}`}
                >
                    <Trash2 className="size-3.5" />
                </Button>
            ) : null}
        </div>
    );
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

    return (
        <div className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
            <div className="flex flex-col gap-2.5 border-b border-[#e2eaf3] px-3 py-2.5 sm:flex-row sm:items-center sm:px-4">
                <TableSearchFilter
                    value={filters.search}
                    onChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar título o lugar..."
                    className="max-w-none sm:max-w-sm"
                />
                <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) =>
                        visit({
                            status: value === 'all' ? null : value,
                            page: 1,
                        })
                    }
                >
                    <SelectTrigger className="h-9 w-full cursor-pointer border-[#c5d5e6] bg-white sm:w-48">
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="border-[#d7e3f0] bg-white">
                        <SelectItem value="all" className="cursor-pointer">
                            Todos los estados
                        </SelectItem>
                        {statusOptions.map((option) => (
                            <SelectItem
                                key={option.value}
                                value={option.value}
                                className="cursor-pointer"
                            >
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-xs">
                    <thead className="bg-[#1a2b4c] text-white">
                        <tr>
                            <th className="px-3 py-2 font-semibold">Código</th>
                            <th className="px-3 py-2 font-semibold">Título</th>
                            <th className="px-3 py-2 font-semibold">
                                Fecha / hora
                            </th>
                            <th className="px-3 py-2 font-semibold">Estado</th>
                            <th className="px-3 py-2 text-center font-semibold">
                                Asistentes
                            </th>
                            <th className="px-3 py-2 font-semibold">Periodo</th>
                            <th className="w-36 px-3 py-2" aria-label="Acciones" />
                        </tr>
                    </thead>
                    <tbody>
                        {inductions.data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-3 py-10 text-center text-[#6b8ead]"
                                >
                                    No hay inducciones registradas.
                                </td>
                            </tr>
                        ) : (
                            inductions.data.map((induction, index) => (
                                <tr
                                    key={induction.id}
                                    className={cn(
                                        'border-b border-[#eef2f7] last:border-0',
                                        index % 2 === 1 && 'bg-[#f8fafc]',
                                    )}
                                >
                                    <td className="px-3 py-1.5 font-mono text-[11px] text-[#5a7390]">
                                        {induction.document_code || '—'}
                                    </td>
                                    <td className="px-3 py-1.5 font-medium text-[#1a2b4c]">
                                        <div>{induction.title}</div>
                                        {induction.location ? (
                                            <div className="text-[11px] font-normal text-[#6b8ead]">
                                                {induction.location}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-1.5 text-[#5a7390]">
                                        {formatDateTime(induction.scheduled_at)}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span
                                            className={cn(
                                                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                statusTone[induction.status] ??
                                                    'bg-slate-100 text-slate-700',
                                            )}
                                        >
                                            {statusLabel(
                                                induction.status,
                                                statusOptions,
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onViewAttendees(induction)
                                            }
                                            className="cursor-pointer rounded-md px-1.5 py-0.5 font-medium text-[#2e5a9e] underline-offset-2 hover:bg-[#e8f1fa] hover:underline"
                                            title="Ver asistentes"
                                        >
                                            {induction.attended_count ?? 0}/
                                            {induction.attendees_count ?? 0}
                                        </button>
                                    </td>
                                    <td className="px-3 py-1.5 text-[#5a7390]">
                                        {induction.period?.name || '—'}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <UnitActions
                                            induction={induction}
                                            statusOptions={statusOptions}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            className="justify-end"
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="space-y-2.5 p-3 md:hidden">
                {inductions.data.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#6b8ead]">
                        No hay inducciones registradas.
                    </p>
                ) : (
                    inductions.data.map((induction) => (
                        <article
                            key={induction.id}
                            className="rounded-xl border border-[#e2eaf3] p-3.5"
                        >
                            <h3 className="text-sm font-semibold text-[#1a2b4c]">
                                {induction.title}
                            </h3>
                            <p className="mt-0.5 font-mono text-[11px] text-[#5a7390]">
                                {induction.document_code || 'Sin código'}
                            </p>
                            <p className="mt-1 text-xs text-[#5a7390]">
                                {formatDateTime(induction.scheduled_at)}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <span
                                    className={cn(
                                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                        statusTone[induction.status] ??
                                            'bg-slate-100 text-slate-700',
                                    )}
                                >
                                    {statusLabel(induction.status, statusOptions)}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onViewAttendees(induction)}
                                    className="cursor-pointer text-xs font-medium text-[#2e5a9e] hover:underline"
                                >
                                    Asistentes {induction.attended_count ?? 0}/
                                    {induction.attendees_count ?? 0}
                                </button>
                            </div>
                            <div className="mt-2 flex justify-end">
                                <UnitActions
                                    induction={induction}
                                    statusOptions={statusOptions}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            </div>
                        </article>
                    ))
                )}
            </div>

            <TablePagination
                meta={{
                    from: inductions.from,
                    to: inductions.to,
                    total: inductions.total,
                    current_page: inductions.current_page,
                    last_page: inductions.last_page,
                    per_page: inductions.per_page,
                }}
                onPageChange={(page) => visit({ page })}
                onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
            />
        </div>
    );
}
