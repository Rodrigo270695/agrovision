import { Head, Link, router, usePage } from '@inertiajs/react';
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
import { dashboard } from '@/routes';
import { cn } from '@/lib/utils';

type ConsolidationRow = {
    id: number;
    plate_number: string;
    driver_name?: string | null;
    coordinator_status: 'observed' | 'reviewed';
    sent_to_coordinator_at?: string | null;
    first_result?: string | null;
    template?: { type: string; code: string; name: string } | null;
    period?: { name: string } | null;
};

type Pagination = {
    data: ConsolidationRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    search: string;
    status: 'observed' | 'reviewed' | 'all';
    per_page: number;
};

type PageProps = {
    items: Pagination;
    filters: Filters;
    stats: { total: number; observed: number; reviewed: number };
};

export default function ConsolidationsIndexPage() {
    const { items, filters, stats } = usePage().props as unknown as PageProps;

    const visit = useCallback(
        (params: Partial<Filters> & { page?: number }) => {
            router.get(
                '/consolidados',
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
        <>
            <Head title="Consolidados" />
            <div className="flex flex-col gap-4 p-4">
                <div className="rounded-2xl border border-[#d7e3f0] bg-white p-5 shadow-sm sm:p-6">
                    <h1 className="font-display inline-block border-b-2 border-[#4a90e2] pb-1 text-2xl font-semibold text-[#1a2b4c]">
                        Consolidados
                    </h1>
                    <p className="mt-2 text-sm text-[#5a7390]">
                        Informes enviados a coordinador. Solo ves los de tus
                        unidades (si eres coordinador).
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-[#eef4fb] px-2.5 py-1 text-xs font-medium text-[#1a2b4c]">
                            Total {stats.total}
                        </span>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">
                            Observados {stats.observed}
                        </span>
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800">
                            Revisados {stats.reviewed}
                        </span>
                    </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
                    <div className="flex flex-col gap-2 border-b border-[#e2eaf3] p-3 sm:flex-row sm:items-center">
                        <TableSearchFilter
                            value={filters.search}
                            onChange={(search) => visit({ search, page: 1 })}
                            placeholder="Buscar placa o conductor..."
                            className="max-w-none flex-1"
                        />
                        <Select
                            value={filters.status}
                            onValueChange={(status) =>
                                visit({
                                    status: status as Filters['status'],
                                    page: 1,
                                })
                            }
                        >
                            <SelectTrigger className="h-9 w-full cursor-pointer border-[#c5d5e6] bg-white sm:w-44">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white">
                                <SelectItem value="observed" className="cursor-pointer">
                                    Observados
                                </SelectItem>
                                <SelectItem value="reviewed" className="cursor-pointer">
                                    Revisados
                                </SelectItem>
                                <SelectItem value="all" className="cursor-pointer">
                                    Todos
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="hidden overflow-x-auto md:block">
                        <table className="min-w-full text-left text-xs">
                            <thead className="bg-[#1a2b4c] text-white">
                                <tr>
                                    <th className="px-3 py-2 font-semibold">
                                        Placa
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        Tipo
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        Periodo
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        Estado
                                    </th>
                                    <th className="px-3 py-2 font-semibold">
                                        Enviado
                                    </th>
                                    <th className="w-28 px-3 py-2" />
                                </tr>
                            </thead>
                            <tbody>
                                {items.data.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-3 py-10 text-center text-[#6b8ead]"
                                        >
                                            No hay consolidados en este filtro.
                                        </td>
                                    </tr>
                                ) : (
                                    items.data.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className={cn(
                                                'border-b border-[#eef2f7]',
                                                index % 2 === 1 &&
                                                    'bg-[#f8fafc]',
                                            )}
                                        >
                                            <td className="px-3 py-2">
                                                <div className="font-medium text-[#1a2b4c]">
                                                    {item.plate_number}
                                                </div>
                                                <div className="text-[#5a7390]">
                                                    {item.driver_name || '—'}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 uppercase text-[#5a7390]">
                                                {item.template?.type ?? '—'}
                                            </td>
                                            <td className="px-3 py-2 text-[#5a7390]">
                                                {item.period?.name ?? '—'}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={cn(
                                                        'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                        item.coordinator_status ===
                                                            'reviewed'
                                                            ? 'bg-violet-50 text-violet-800'
                                                            : 'bg-amber-50 text-amber-800',
                                                    )}
                                                >
                                                    {item.coordinator_status ===
                                                    'reviewed'
                                                        ? 'Revisado'
                                                        : 'Observado'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-[#5a7390]">
                                                {item.sent_to_coordinator_at
                                                    ? new Date(
                                                          item.sent_to_coordinator_at,
                                                      ).toLocaleString(
                                                          'es-PE',
                                                          {
                                                              timeZone:
                                                                  'America/Lima',
                                                          },
                                                      )
                                                    : '—'}
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
                                                        href={`/consolidados/${item.id}`}
                                                    >
                                                        {item.coordinator_status ===
                                                        'observed'
                                                            ? 'Responder'
                                                            : 'Ver'}
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
                                No hay consolidados en este filtro.
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
                                                {item.plate_number || 'Sin placa'}
                                            </h3>
                                            <p className="mt-0.5 text-xs text-[#5a7390]">
                                                {item.driver_name ||
                                                    'Sin conductor'}
                                            </p>
                                        </div>
                                        <span
                                            className={cn(
                                                'shrink-0 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                item.coordinator_status ===
                                                    'reviewed'
                                                    ? 'bg-violet-50 text-violet-800'
                                                    : 'bg-amber-50 text-amber-800',
                                            )}
                                        >
                                            {item.coordinator_status ===
                                            'reviewed'
                                                ? 'Revisado'
                                                : 'Observado'}
                                        </span>
                                    </div>

                                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <dt className="text-[11px] text-[#6b8ead]">
                                                Tipo
                                            </dt>
                                            <dd className="text-xs font-medium uppercase text-[#1a2b4c]">
                                                {item.template?.type ?? '—'}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-[11px] text-[#6b8ead]">
                                                Periodo
                                            </dt>
                                            <dd className="text-xs font-medium text-[#1a2b4c]">
                                                {item.period?.name ?? '—'}
                                            </dd>
                                        </div>
                                        <div className="col-span-2">
                                            <dt className="text-[11px] text-[#6b8ead]">
                                                Enviado
                                            </dt>
                                            <dd className="text-xs font-medium text-[#1a2b4c]">
                                                {item.sent_to_coordinator_at
                                                    ? new Date(
                                                          item.sent_to_coordinator_at,
                                                      ).toLocaleString(
                                                          'es-PE',
                                                          {
                                                              timeZone:
                                                                  'America/Lima',
                                                          },
                                                      )
                                                    : '—'}
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
                                            <Link
                                                href={`/consolidados/${item.id}`}
                                            >
                                                {item.coordinator_status ===
                                                'observed'
                                                    ? 'Responder'
                                                    : 'Ver'}
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
                        onPerPageChange={(per_page) =>
                            visit({ per_page, page: 1 })
                        }
                    />
                </div>
            </div>
        </>
    );
}

ConsolidationsIndexPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Consolidados', href: '/consolidados' },
    ],
};
