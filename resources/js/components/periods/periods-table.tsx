import { Pencil, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback } from 'react';
import { TablePagination } from '@/components/shared/table-pagination';
import { TableSearchFilter } from '@/components/shared/table-search-filter';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { cn } from '@/lib/utils';

export type PeriodItem = {
    id: number;
    name: string;
    date: string;
    status: 'active' | 'inactive' | string;
    units_count?: number;
    created_at?: string | null;
};

export type PeriodsPagination = {
    data: PeriodItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type PeriodsFilters = {
    search: string;
    sort: 'name' | 'date' | 'status' | 'units_count' | 'created_at';
    direction: 'asc' | 'desc';
    per_page: number;
};

type Props = {
    periods: PeriodsPagination;
    filters: PeriodsFilters;
    onEdit: (period: PeriodItem) => void;
    onDelete: (period: PeriodItem) => void;
};

type SortKey = PeriodsFilters['sort'];

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

function StatusBadge({ status }: { status: string }) {
    const active = status === 'active';

    return (
        <span
            className={cn(
                'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold',
                active
                    ? 'bg-[#e8f7ef] text-[#15803d]'
                    : 'bg-[#eef1f5] text-[#64748b]',
            )}
        >
            {active ? 'Activo' : 'Inactivo'}
        </span>
    );
}

function PeriodActions({
    period,
    onEdit,
    onDelete,
    className,
}: {
    period: PeriodItem;
    onEdit: (period: PeriodItem) => void;
    onDelete: (period: PeriodItem) => void;
    className?: string;
}) {
    const { can } = useCan();
    const canUpdate = can('periods.update');
    const canDelete = can('periods.delete');

    if (!canUpdate && !canDelete) {
        return null;
    }

    return (
        <div className={cn('flex items-center gap-0.5', className)}>
            {canUpdate ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(period)}
                    className="size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                    aria-label={`Editar ${period.name}`}
                >
                    <Pencil className="size-3.5" />
                </Button>
            ) : null}
            {canDelete ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(period)}
                    className="size-7 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Eliminar ${period.name}`}
                >
                    <Trash2 className="size-3.5" />
                </Button>
            ) : null}
        </div>
    );
}

export function PeriodsTable({ periods, filters, onEdit, onDelete }: Props) {
    const visit = useCallback(
        (params: Partial<PeriodsFilters> & { page?: number }) => {
            router.get(
                '/periodos',
                {
                    search: params.search ?? filters.search,
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

    const toggleSort = (column: SortKey) => {
        if (filters.sort === column) {
            visit({
                sort: column,
                direction: filters.direction === 'asc' ? 'desc' : 'asc',
                page: 1,
            });
            return;
        }

        visit({ sort: column, direction: 'asc', page: 1 });
    };

    const headers: Array<{
        key: SortKey;
        label: string;
        className?: string;
    }> = [
        { key: 'name', label: 'Nombre' },
        { key: 'date', label: 'Fecha', className: 'text-center' },
        { key: 'status', label: 'Estado', className: 'text-center' },
        { key: 'units_count', label: 'Unidades', className: 'text-center' },
    ];

    return (
        <div className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
            <div className="border-b border-[#e2eaf3] px-3 py-2.5 sm:px-4">
                <TableSearchFilter
                    value={filters.search}
                    onChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar por nombre o estado..."
                />
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-xs">
                    <thead className="bg-[#1a2b4c] text-white">
                        <tr>
                            {headers.map((header) => (
                                <th
                                    key={header.key}
                                    className={cn(
                                        'px-3 py-2 text-xs font-semibold',
                                        header.className,
                                    )}
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleSort(header.key)}
                                        className={cn(
                                            'inline-flex cursor-pointer items-center font-semibold hover:opacity-90',
                                            header.className?.includes(
                                                'text-center',
                                            ) && 'w-full justify-center',
                                        )}
                                    >
                                        {header.label}
                                        <SortIcon
                                            active={filters.sort === header.key}
                                            direction={filters.direction}
                                        />
                                    </button>
                                </th>
                            ))}
                            <th className="w-20 px-3 py-2" aria-label="Acciones" />
                        </tr>
                    </thead>
                    <tbody>
                        {periods.data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={5}
                                    className="px-3 py-10 text-center text-[#6b8ead]"
                                >
                                    No se encontraron periodos.
                                </td>
                            </tr>
                        ) : (
                            periods.data.map((period, index) => (
                                <tr
                                    key={period.id}
                                    className={cn(
                                        'border-b border-[#eef2f7] last:border-0',
                                        index % 2 === 1 && 'bg-[#f8fafc]',
                                    )}
                                >
                                    <td className="px-3 py-1.5 font-medium text-[#1a2b4c]">
                                        {period.name}
                                    </td>
                                    <td className="px-3 py-1.5 text-center text-[#5a7390]">
                                        {formatDate(period.date)}
                                    </td>
                                    <td className="px-3 py-1.5 text-center">
                                        <StatusBadge status={period.status} />
                                    </td>
                                    <td className="px-3 py-1.5 text-center text-[#5a7390]">
                                        {period.units_count ?? 0}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <PeriodActions
                                            period={period}
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
                {periods.data.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#6b8ead]">
                        No se encontraron periodos.
                    </p>
                ) : (
                    periods.data.map((period) => (
                        <article
                            key={period.id}
                            className="rounded-xl border border-[#e2eaf3] bg-white p-3.5 shadow-sm"
                        >
                            <div className="mb-2 flex items-start justify-between gap-2">
                                <h3 className="text-sm font-semibold text-[#1a2b4c]">
                                    {period.name}
                                </h3>
                                <StatusBadge status={period.status} />
                            </div>
                            <dl className="mb-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Fecha
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {formatDate(period.date)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Unidades
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {period.units_count ?? 0}
                                    </dd>
                                </div>
                            </dl>
                            <div className="flex justify-end border-t border-[#eef2f7] pt-2">
                                <PeriodActions
                                    period={period}
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
                    from: periods.from,
                    to: periods.to,
                    total: periods.total,
                    current_page: periods.current_page,
                    last_page: periods.last_page,
                    per_page: periods.per_page,
                }}
                onPageChange={(page) => visit({ page })}
                onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
            />
        </div>
    );
}
