import { Link, router } from '@inertiajs/react';
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
import { cn } from '@/lib/utils';

export type AlcoholTestItem = {
    id: number;
    tested_at?: string | null;
    driver_name: string;
    driver_dni?: string | null;
    plate_number?: string | null;
    alcohol_level: number;
    is_positive: boolean;
    coordinator_status?: string | null;
    period?: { id: number; name: string } | null;
    unit?: { id: number; correlative?: string | null } | null;
};

export type AlcoholTestsFilters = {
    search: string;
    status: string;
    per_page: number;
};

export type AlcoholTestsPagination = {
    data: AlcoholTestItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type UnitOption = {
    id: number;
    label: string;
    driver_name: string | null;
    driver_dni: string | null;
    plate_number: string | null;
    coordinator_id: number | null;
};

type Props = {
    items: AlcoholTestsPagination;
    filters: AlcoholTestsFilters;
};

function formatDateTime(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date.toLocaleString('es-PE', {
        timeZone: 'America/Lima',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function AlcoholTestsTable({ items, filters }: Props) {
    const visit = useCallback(
        (params: Partial<AlcoholTestsFilters> & { page?: number }) => {
            router.get(
                '/alcoholimetro',
                {
                    search: params.search ?? filters.search,
                    status: params.status ?? filters.status,
                    per_page: params.per_page ?? filters.per_page,
                    page: params.page ?? 1,
                },
                { preserveState: true, replace: true },
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
                    placeholder="Buscar conductor, DNI o placa..."
                    className="max-w-none sm:max-w-sm"
                />
                <Select
                    value={filters.status || 'all'}
                    onValueChange={(status) => visit({ status, page: 1 })}
                >
                    <SelectTrigger className="h-9 w-full cursor-pointer border-[#c5d5e6] bg-white sm:w-48">
                        <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent className="border-[#d7e3f0] bg-white">
                        <SelectItem value="all" className="cursor-pointer">
                            Todos
                        </SelectItem>
                        <SelectItem value="positive" className="cursor-pointer">
                            Positivos
                        </SelectItem>
                        <SelectItem value="negative" className="cursor-pointer">
                            Negativos
                        </SelectItem>
                        <SelectItem value="pending" className="cursor-pointer">
                            Pendientes firma
                        </SelectItem>
                        <SelectItem
                            value="acknowledged"
                            className="cursor-pointer"
                        >
                            Firmados
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-xs">
                    <thead className="bg-[#1a2b4c] text-white">
                        <tr>
                            <th className="px-3 py-2 font-semibold">Fecha</th>
                            <th className="px-3 py-2 font-semibold">
                                Conductor
                            </th>
                            <th className="px-3 py-2 font-semibold">Placa</th>
                            <th className="px-3 py-2 font-semibold">Nivel %</th>
                            <th className="px-3 py-2 font-semibold">
                                Resultado
                            </th>
                            <th className="px-3 py-2 font-semibold">Acta</th>
                            <th className="w-28 px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {items.data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-3 py-10 text-center text-[#6b8ead]"
                                >
                                    No hay tests registrados.
                                </td>
                            </tr>
                        ) : (
                            items.data.map((item, index) => (
                                <tr
                                    key={item.id}
                                    className={cn(
                                        'border-b border-[#eef2f7] last:border-0',
                                        index % 2 === 1 && 'bg-[#f8fafc]',
                                    )}
                                >
                                    <td className="px-3 py-2 text-[#5a7390]">
                                        {formatDateTime(item.tested_at)}
                                    </td>
                                    <td className="px-3 py-2">
                                        <div className="font-medium text-[#1a2b4c]">
                                            {item.driver_name}
                                        </div>
                                        <div className="text-[#5a7390]">
                                            {item.driver_dni || '—'}
                                        </div>
                                    </td>
                                    <td className="px-3 py-2 text-[#5a7390]">
                                        {item.plate_number || '—'}
                                    </td>
                                    <td className="px-3 py-2 font-semibold text-[#1a2b4c]">
                                        {item.alcohol_level.toFixed(3)}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={cn(
                                                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                item.is_positive
                                                    ? 'bg-red-50 text-red-800'
                                                    : 'bg-emerald-50 text-emerald-800',
                                            )}
                                        >
                                            {item.is_positive
                                                ? 'Positivo'
                                                : 'Negativo'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        {item.is_positive ? (
                                            <span
                                                className={cn(
                                                    'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                    item.coordinator_status ===
                                                        'acknowledged'
                                                        ? 'bg-violet-50 text-violet-800'
                                                        : 'bg-amber-50 text-amber-800',
                                                )}
                                            >
                                                {item.coordinator_status ===
                                                'acknowledged'
                                                    ? 'Firmada'
                                                    : 'Pendiente'}
                                            </span>
                                        ) : (
                                            <span className="text-[#6b8ead]">
                                                —
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                        >
                                            <Link
                                                href={`/alcoholimetro/${item.id}`}
                                            >
                                                Ver
                                            </Link>
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="space-y-2.5 p-3 md:hidden">
                {items.data.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#6b8ead]">
                        No hay tests registrados.
                    </p>
                ) : (
                    items.data.map((item) => (
                        <article
                            key={item.id}
                            className="rounded-xl border border-[#e2eaf3] bg-white p-3.5 shadow-sm"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h3 className="text-sm font-semibold text-[#1a2b4c]">
                                        {item.driver_name}
                                    </h3>
                                    <p className="mt-0.5 text-xs text-[#5a7390]">
                                        {item.plate_number || 'Sin placa'} ·{' '}
                                        {formatDateTime(item.tested_at)}
                                    </p>
                                </div>
                                <span
                                    className={cn(
                                        'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                        item.is_positive
                                            ? 'bg-red-50 text-red-800'
                                            : 'bg-emerald-50 text-emerald-800',
                                    )}
                                >
                                    {item.is_positive ? 'Positivo' : 'Negativo'}
                                </span>
                            </div>
                            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Nivel
                                    </dt>
                                    <dd className="text-xs font-semibold text-[#1a2b4c]">
                                        {item.alcohol_level.toFixed(3)} %
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Acta
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {!item.is_positive
                                            ? '—'
                                            : item.coordinator_status ===
                                                'acknowledged'
                                              ? 'Firmada'
                                              : 'Pendiente'}
                                    </dd>
                                </div>
                            </dl>
                            <div className="mt-3 flex justify-end border-t border-[#eef2f7] pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                >
                                    <Link href={`/alcoholimetro/${item.id}`}>
                                        Ver
                                    </Link>
                                </Button>
                            </div>
                        </article>
                    ))
                )}
            </div>

            <TablePagination
                meta={{
                    from: items.from,
                    to: items.to,
                    total: items.total,
                    current_page: items.current_page,
                    last_page: items.last_page,
                    per_page: items.per_page,
                }}
                onPageChange={(page) => visit({ page })}
                onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
            />
        </div>
    );
}
