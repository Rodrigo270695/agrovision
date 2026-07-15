import {
    Bus,
    CircleCheck,
    ClipboardCheck,
    FileDown,
    FileText,
    Pencil,
    Trash2,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback } from 'react';
import { ElegantFilterSelect } from '@/components/shared/elegant-filter-select';
import { TablePagination } from '@/components/shared/table-pagination';
import { TableSearchFilter } from '@/components/shared/table-search-filter';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';

export type ChecklistItemRow = {
    id: number;
    plate_number: string;
    driver_name?: string | null;
    provider?: string | null;
    status: 'draft' | 'completed';
    sealed_at?: string | null;
    first_result?: 'approved' | 'rejected' | null;
    second_result?: 'approved' | 'rejected' | null;
    coordinator_status?: 'observed' | 'reviewed' | null;
    created_at?: string | null;
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
    template_type?: 'tdp' | 'tdc' | null;
    status?: 'draft' | 'completed' | null;
    sort: 'plate_number' | 'created_at' | 'status' | 'first_result';
    direction: 'asc' | 'desc';
    per_page: number;
};

type Props = {
    checklists: ChecklistsPagination;
    filters: ChecklistsFilters;
    onEdit: (item: ChecklistItemRow) => void;
    onDelete: (item: ChecklistItemRow) => void;
    onPreviewPdf: (item: ChecklistItemRow) => void;
};

type SortKey = ChecklistsFilters['sort'];

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

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

function resultLabel(value?: string | null): string {
    if (value === 'approved') {
        return 'Aprobado';
    }

    if (value === 'rejected') {
        return 'Desaprobado';
    }

    return 'Pendiente';
}

function ResultChip({ value }: { value?: string | null }) {
    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                value === 'approved'
                    ? 'bg-[#e8f7ef] text-[#15803d]'
                    : value === 'rejected'
                      ? 'bg-red-50 text-red-700'
                      : 'bg-[#eef1f5] text-[#64748b]',
            )}
        >
            {resultLabel(value)}
        </span>
    );
}

function SortIcon({
    active,
    direction,
}: {
    active: boolean;
    direction: 'asc' | 'desc';
}) {
    if (!active) {
        return <span className="ml-1 opacity-60">↕</span>;
    }

    return (
        <span className="ml-1" aria-hidden>
            {direction === 'asc' ? '↑' : '↓'}
        </span>
    );
}

export function ChecklistsTable({
    checklists,
    filters,
    onEdit,
    onDelete,
    onPreviewPdf,
}: Props) {
    const { can } = useCan();

    const visit = useCallback(
        (params: Partial<ChecklistsFilters> & { page?: number }) => {
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

            router.get(
                '/inspecciones',
                {
                    search: params.search ?? filters.search,
                    ...(nextType ? { template_type: nextType } : {}),
                    ...(nextStatus ? { status: nextStatus } : {}),
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

    const toggleSort = (column: SortKey) => {
        if (filters.sort === column) {
            visit({
                direction: filters.direction === 'asc' ? 'desc' : 'asc',
            });

            return;
        }

        visit({ sort: column, direction: 'asc' });
    };

    const headers: Array<{ key: SortKey | 'second_result'; label: string; sortable?: boolean }> = [
        { key: 'plate_number', label: 'Placa', sortable: true },
        { key: 'status', label: 'Estado', sortable: true },
        { key: 'first_result', label: '1ra insp.', sortable: true },
        { key: 'second_result', label: '2da insp.', sortable: false },
        { key: 'created_at', label: 'Creado', sortable: true },
    ];

    return (
        <div className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#e2eaf3] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <TableSearchFilter
                    value={filters.search}
                    onChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar placa, conductor..."
                    className="max-w-none sm:max-w-sm"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                    <ElegantFilterSelect
                        value={filters.template_type ?? null}
                        onChange={(value) =>
                            visit({
                                template_type: value as 'tdp' | 'tdc' | null,
                                page: 1,
                            })
                        }
                        triggerIcon={Bus}
                        allLabel="Todos los tipos"
                        allDescription="TDP y TDC"
                        placeholder="Todos los tipos"
                        className="sm:w-[200px]"
                        options={[
                            {
                                value: 'tdp',
                                label: 'TDP',
                                description: 'Unidades móviles / personal',
                                icon: ClipboardCheck,
                                iconClassName:
                                    'bg-[#e8f1fa] text-[#2e5a9e]',
                            },
                            {
                                value: 'tdc',
                                label: 'TDC',
                                description: 'Camionetas de carga',
                                icon: Bus,
                                iconClassName:
                                    'bg-[#efe8fb] text-[#6d28d9]',
                            },
                        ]}
                    />
                    <ElegantFilterSelect
                        value={filters.status ?? null}
                        onChange={(value) =>
                            visit({
                                status: value as 'draft' | 'completed' | null,
                                page: 1,
                            })
                        }
                        triggerIcon={FileText}
                        allLabel="Todos los estados"
                        allDescription="Borrador y completados"
                        placeholder="Todos los estados"
                        className="sm:w-[210px]"
                        options={[
                            {
                                value: 'draft',
                                label: 'Borrador',
                                description: 'Inspección en progreso',
                                icon: FileText,
                                iconClassName:
                                    'bg-[#fff1e6] text-[#c2410c]',
                            },
                            {
                                value: 'completed',
                                label: 'Completado',
                                description: 'Inspección finalizada',
                                icon: CircleCheck,
                                iconClassName:
                                    'bg-[#e8f7ef] text-[#15803d]',
                            },
                        ]}
                    />
                </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-[#1a2b4c] text-xs uppercase tracking-wide text-white">
                        <tr>
                            {headers.map((header) => (
                                <th key={header.key} className="px-3 py-2.5">
                                    {header.sortable ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleSort(header.key as SortKey)
                                            }
                                            className="inline-flex cursor-pointer items-center font-semibold"
                                        >
                                            {header.label}
                                            <SortIcon
                                                active={
                                                    filters.sort === header.key
                                                }
                                                direction={filters.direction}
                                            />
                                        </button>
                                    ) : (
                                        <span className="font-semibold">
                                            {header.label}
                                        </span>
                                    )}
                                </th>
                            ))}
                            <th className="px-3 py-2.5">Tipo</th>
                            <th className="px-3 py-2.5">Periodo</th>
                            <th className="px-3 py-2.5 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {checklists.data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={8}
                                    className="px-3 py-10 text-center text-[#6b8ead]"
                                >
                                    No hay inspecciones del periodo activo.
                                </td>
                            </tr>
                        ) : (
                            checklists.data.map((item, index) => {
                                const sealed = Boolean(item.sealed_at);

                                return (
                                <tr
                                    key={item.id}
                                    className={cn(
                                        'border-b border-[#eef2f7] last:border-0',
                                        index % 2 === 1 && 'bg-[#f8fafc]',
                                    )}
                                >
                                    <td className="px-3 py-1.5 font-medium text-[#1a2b4c]">
                                        {item.plate_number}
                                        <p className="text-xs font-normal text-[#5a7390]">
                                            {item.driver_name || 'Sin conductor'}
                                        </p>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span
                                            className={cn(
                                                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                sealed
                                                    ? 'bg-[#e8f1fa] text-[#2e5a9e]'
                                                    : item.coordinator_status ===
                                                        'reviewed'
                                                      ? 'bg-violet-50 text-violet-800'
                                                      : item.coordinator_status ===
                                                          'observed'
                                                        ? 'bg-amber-50 text-amber-800'
                                                        : item.status ===
                                                            'completed'
                                                          ? 'bg-[#e8f7ef] text-[#15803d]'
                                                          : 'bg-[#fff1e6] text-[#c2410c]',
                                            )}
                                        >
                                            {sealed
                                                ? 'Sellado'
                                                : item.coordinator_status ===
                                                    'reviewed'
                                                  ? 'Revisado'
                                                  : item.coordinator_status ===
                                                      'observed'
                                                    ? 'Observado'
                                                    : item.status ===
                                                        'completed'
                                                      ? 'Completado'
                                                      : 'Borrador'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <ResultChip value={item.first_result} />
                                    </td>
                                    <td className="px-3 py-1.5">
                                        {item.coordinator_status ===
                                        'reviewed' ? (
                                            <ResultChip
                                                value={item.second_result}
                                            />
                                        ) : item.coordinator_status ===
                                          'observed' ? (
                                            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                                En revisión
                                            </span>
                                        ) : (
                                            <ResultChip value={null} />
                                        )}
                                    </td>
                                    <td className="px-3 py-1.5 text-[#5a7390]">
                                        {formatDate(item.created_at)}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <span className="inline-flex rounded-md bg-[#e8f1fa] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#2e5a9e]">
                                            {item.template?.type ?? '—'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-1.5 text-[#5a7390]">
                                        {item.period?.name || '—'}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex items-center justify-end gap-0.5">
                                            {(item.first_result === 'approved' ||
                                                item.first_result ===
                                                    'rejected') &&
                                            can('checklists.view') ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        onPreviewPdf(item)
                                                    }
                                                    className="size-7 cursor-pointer text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                                    aria-label={`Ver PDF ${item.plate_number}`}
                                                >
                                                    <FileDown className="size-3.5" />
                                                </Button>
                                            ) : null}
                                            {can('checklists.update') || sealed ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => onEdit(item)}
                                                    className="size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                                                    aria-label={
                                                        sealed
                                                            ? `Ver ${item.plate_number}`
                                                            : `Editar ${item.plate_number}`
                                                    }
                                                >
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                            ) : null}
                                            {can('checklists.delete') && !sealed ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        onDelete(item)
                                                    }
                                                    className="size-7 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700"
                                                    aria-label={`Eliminar ${item.plate_number}`}
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </Button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="space-y-2.5 p-3 md:hidden">
                {checklists.data.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#6b8ead]">
                        No hay inspecciones del periodo activo.
                    </p>
                ) : (
                    checklists.data.map((item) => {
                        const sealed = Boolean(item.sealed_at);

                        return (
                        <article
                            key={item.id}
                            className="rounded-xl border border-[#e2eaf3] bg-white p-3.5 shadow-sm"
                        >
                            <div className="mb-2 flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="text-sm font-semibold text-[#1a2b4c]">
                                        {item.plate_number}
                                    </h3>
                                    <p className="text-xs text-[#5a7390]">
                                        {(item.template?.type ?? '—').toUpperCase()}{' '}
                                        · {item.period?.name || 'Sin periodo'}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                        sealed
                                            ? 'bg-[#e8f1fa] text-[#2e5a9e]'
                                            : item.coordinator_status ===
                                                'reviewed'
                                              ? 'bg-violet-50 text-violet-800'
                                              : item.coordinator_status ===
                                                  'observed'
                                                ? 'bg-amber-50 text-amber-800'
                                                : item.status === 'completed'
                                                  ? 'bg-[#e8f7ef] text-[#15803d]'
                                                  : 'bg-[#fff1e6] text-[#c2410c]',
                                    )}
                                >
                                    {sealed
                                        ? 'Sellado'
                                        : item.coordinator_status === 'reviewed'
                                          ? 'Revisado'
                                          : item.coordinator_status ===
                                              'observed'
                                            ? 'Observado'
                                            : item.status === 'completed'
                                              ? 'Completado'
                                              : 'Borrador'}
                                </span>
                            </div>
                            <div className="mb-3 flex flex-wrap gap-2">
                                <ResultChip value={item.first_result} />
                                {item.coordinator_status === 'reviewed' ? (
                                    <ResultChip value={item.second_result} />
                                ) : item.coordinator_status === 'observed' ? (
                                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                        En revisión
                                    </span>
                                ) : (
                                    <ResultChip value={null} />
                                )}
                            </div>
                            <div className="mb-1 flex flex-wrap gap-1">
                                {(item.first_result === 'approved' ||
                                    item.first_result === 'rejected') &&
                                can('checklists.view') ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onPreviewPdf(item)}
                                        className="cursor-pointer border-emerald-200 text-emerald-700"
                                    >
                                        <FileDown className="size-3.5" />
                                        PDF
                                    </Button>
                                ) : null}
                                {can('checklists.update') || sealed ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onEdit(item)}
                                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                    >
                                        <Pencil className="size-3.5" />
                                        {sealed ? 'Ver' : 'Abrir'}
                                    </Button>
                                ) : null}
                                {can('checklists.delete') && !sealed ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onDelete(item)}
                                        className="cursor-pointer border-red-200 text-red-600"
                                    >
                                        <Trash2 className="size-3.5" />
                                        Eliminar
                                    </Button>
                                ) : null}
                            </div>
                        </article>
                        );
                    })
                )}
            </div>

            <TablePagination
                meta={{
                    from: checklists.from,
                    to: checklists.to,
                    total: checklists.total,
                    current_page: checklists.current_page,
                    last_page: checklists.last_page,
                    per_page: checklists.per_page,
                }}
                onPageChange={(page) => visit({ page })}
                onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
            />
        </div>
    );
}
