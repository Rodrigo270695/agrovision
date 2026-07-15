import { Link, router } from '@inertiajs/react';
import { useCallback } from 'react';
import { TablePagination } from '@/components/shared/table-pagination';
import { TableSearchFilter } from '@/components/shared/table-search-filter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AlcoholPackageItem = {
    id: number;
    title: string;
    session_date?: string | null;
    notes?: string | null;
    status?: string;
    sent_to_coordinators_at?: string | null;
    tests_count: number;
    positive_count: number;
    pending_count: number;
    creator?: { id: number; name: string } | null;
};

export type AlcoholPackagesFilters = {
    search: string;
    per_page: number;
};

export type AlcoholPackagesPagination = {
    data: AlcoholPackageItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Props = {
    packages: AlcoholPackagesPagination;
    filters: AlcoholPackagesFilters;
    isCoordinatorView?: boolean;
};

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export function AlcoholPackagesTable({
    packages,
    filters,
    isCoordinatorView = false,
}: Props) {
    const visit = useCallback(
        (params: Partial<AlcoholPackagesFilters> & { page?: number }) => {
            router.get(
                '/alcoholimetro',
                {
                    search: params.search ?? filters.search,
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
            <div className="border-b border-[#e2eaf3] px-3 py-2.5 sm:px-4">
                <TableSearchFilter
                    value={filters.search}
                    onChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar por título..."
                    className="max-w-none sm:max-w-sm"
                />
            </div>

            <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-xs">
                    <thead className="bg-[#1a2b4c] text-white">
                        <tr>
                            <th className="px-3 py-2 font-semibold">Título</th>
                            <th className="px-3 py-2 font-semibold">Fecha</th>
                            <th className="px-3 py-2 font-semibold">Estado</th>
                            <th className="px-3 py-2 text-center font-semibold">
                                {isCoordinatorView ? 'Tus tests' : 'Tests'}
                            </th>
                            <th className="px-3 py-2 text-center font-semibold">
                                {isCoordinatorView
                                    ? 'No pasaron'
                                    : 'Positivos'}
                            </th>
                            <th className="px-3 py-2 text-center font-semibold">
                                Pendientes
                            </th>
                            <th className="w-28 px-3 py-2" />
                        </tr>
                    </thead>
                    <tbody>
                        {packages.data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={7}
                                    className="px-3 py-10 text-center text-[#6b8ead]"
                                >
                                    Aún no hay paquetes
                                    {isCoordinatorView
                                        ? ' con tests de tus unidades.'
                                        : '. Crea uno para empezar.'}
                                </td>
                            </tr>
                        ) : (
                            packages.data.map((item, index) => (
                                <tr
                                    key={item.id}
                                    className={cn(
                                        'border-b border-[#eef2f7] last:border-0',
                                        index % 2 === 1 && 'bg-[#f8fafc]',
                                    )}
                                >
                                    <td className="px-3 py-2">
                                        <div className="font-medium text-[#1a2b4c]">
                                            {item.title}
                                        </div>
                                        {item.creator?.name ? (
                                            <div className="text-[11px] text-[#6b8ead]">
                                                {item.creator.name}
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-2 text-[#5a7390]">
                                        {formatDate(item.session_date)}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span
                                            className={cn(
                                                'inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium',
                                                item.status === 'closed'
                                                    ? 'bg-slate-100 text-slate-700'
                                                    : 'bg-emerald-50 text-emerald-800',
                                            )}
                                        >
                                            {item.status === 'closed'
                                                ? 'Cerrado'
                                                : 'Abierto'}
                                        </span>
                                        {item.sent_to_coordinators_at ? (
                                            <div className="mt-0.5 text-[10px] text-sky-800">
                                                Enviado
                                            </div>
                                        ) : null}
                                    </td>
                                    <td className="px-3 py-2 text-center text-[#1a2b4c]">
                                        {item.tests_count}
                                    </td>
                                    <td className="px-3 py-2 text-center text-red-700">
                                        {item.positive_count}
                                    </td>
                                    <td className="px-3 py-2 text-center text-amber-700">
                                        {item.pending_count}
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
                                                Abrir
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
                {packages.data.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#6b8ead]">
                        Aún no hay paquetes
                        {isCoordinatorView
                            ? ' con tests de tus unidades.'
                            : '. Crea uno para empezar.'}
                    </p>
                ) : (
                    packages.data.map((item) => (
                        <article
                            key={item.id}
                            className="rounded-xl border border-[#e2eaf3] bg-white p-3.5 shadow-sm"
                        >
                            <h3 className="text-sm font-semibold text-[#1a2b4c]">
                                {item.title}
                            </h3>
                            <p className="mt-0.5 text-xs text-[#5a7390]">
                                {formatDate(item.session_date)} ·{' '}
                                {item.status === 'closed'
                                    ? 'Cerrado'
                                    : 'Abierto'}
                                {item.sent_to_coordinators_at
                                    ? ' · Enviado'
                                    : ''}
                            </p>
                            <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        {isCoordinatorView ? 'Tus' : 'Tests'}
                                    </dt>
                                    <dd className="text-xs font-semibold text-[#1a2b4c]">
                                        {item.tests_count}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        {isCoordinatorView
                                            ? 'No pasaron'
                                            : '+'}
                                    </dt>
                                    <dd className="text-xs font-semibold text-red-700">
                                        {item.positive_count}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Pend.
                                    </dt>
                                    <dd className="text-xs font-semibold text-amber-700">
                                        {item.pending_count}
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
                                        Abrir
                                    </Link>
                                </Button>
                            </div>
                        </article>
                    ))
                )}
            </div>

            <TablePagination
                meta={{
                    from: packages.from,
                    to: packages.to,
                    total: packages.total,
                    current_page: packages.current_page,
                    last_page: packages.last_page,
                    per_page: packages.per_page,
                }}
                onPageChange={(page) => visit({ page })}
                onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
            />
        </div>
    );
}
