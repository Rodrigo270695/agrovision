import { Eye, Wine } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback, useMemo } from 'react';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    StatBadge,
    type DataTableColumn,
} from '@/components/data-page';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { asPaginated } from '@/lib/paginated';

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

    const columns = useMemo<DataTableColumn<AlcoholPackageItem>[]>(
        () => [
            {
                key: 'title',
                header: 'Título',
                cell: (item) => (
                    <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {item.title}
                        </span>
                        {item.creator?.name ? (
                            <span className="truncate text-xs text-muted-foreground">
                                {item.creator.name}
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'session_date',
                header: 'Fecha',
                cell: (item) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(item.session_date)}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Estado',
                cell: (item) => (
                    <div className="flex flex-col gap-0.5">
                        <StatBadge
                            label={
                                item.status === 'closed' ? 'Cerrado' : 'Abierto'
                            }
                            value=""
                            variant={
                                item.status === 'closed' ? 'muted' : 'success'
                            }
                        />
                        {item.sent_to_coordinators_at ? (
                            <span className="text-[10px] text-sky-800">
                                Enviado
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                key: 'tests_count',
                header: isCoordinatorView ? 'Tus tests' : 'Tests',
                cell: (item) => (
                    <span className="text-xs text-foreground">
                        {item.tests_count}
                    </span>
                ),
            },
            {
                key: 'positive_count',
                header: isCoordinatorView ? 'No pasaron' : 'Positivos',
                cell: (item) => (
                    <span className="text-xs font-medium text-red-700">
                        {item.positive_count}
                    </span>
                ),
            },
            {
                key: 'pending_count',
                header: 'Pendientes',
                cell: (item) => (
                    <span className="text-xs font-medium text-amber-700">
                        {item.pending_count}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                className: 'w-28',
                cell: (item) => (
                    <div className="flex justify-end">
                        <RowActionsMenu
                            label={`Acciones de ${item.title}`}
                            items={[
                                {
                                    key: 'open',
                                    label: 'Abrir',
                                    icon: Eye,
                                    href: `/alcoholimetro/${item.id}`,
                                },
                            ]}
                        />
                    </div>
                ),
            },
        ],
        [isCoordinatorView],
    );

    return (
        <DataTable
            columns={columns}
            data={packages.data}
            rowKey={(item) => item.id}
            ariaLiveMessage={`${packages.total} paquetes encontrados`}
            toolbar={
                <DataToolbar
                    search={filters.search}
                    onSearchChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar por título..."
                />
            }
            footer={
                <DataPagination
                    meta={asPaginated(packages, '/alcoholimetro')}
                    onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
                    preservedQuery={{
                        search: filters.search || undefined,
                        per_page: filters.per_page,
                    }}
                />
            }
            emptyState={
                <EmptyState
                    icon={Wine}
                    title={
                        filters.search
                            ? 'Sin resultados'
                            : 'Aún no hay paquetes'
                    }
                    description={
                        filters.search
                            ? 'Prueba con otro término o limpia la búsqueda.'
                            : isCoordinatorView
                              ? 'Cuando te envíen un operativo con tests de tus unidades, aparecerá aquí.'
                              : 'Crea el primer paquete para registrar tests.'
                    }
                />
            }
        />
    );
}
