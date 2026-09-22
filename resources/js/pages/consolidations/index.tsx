import { Head, router, usePage } from '@inertiajs/react';
import {
    CheckCircle2,
    ClipboardList,
    Eye,
    FileStack,
    Reply,
} from 'lucide-react';
import { useCallback, useMemo } from 'react';
import {
    DataPagination,
    DataTable,
    DataToolbar,
    EmptyState,
    FilterChips,
    PageHeader,
    StatBadge,
    type DataTableColumn,
    type FilterChip,
} from '@/components/data-page';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';
import { asPaginated } from '@/lib/paginated';
import { dashboard } from '@/routes';

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
    });
}

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

    const statusOptions: readonly FilterChip<Filters['status']>[] = useMemo(
        () => [
            {
                value: 'all',
                label: 'Todos',
                count: stats.total,
                tone: 'default',
            },
            {
                value: 'observed',
                label: 'Observados',
                count: stats.observed,
                tone: 'warning',
            },
            {
                value: 'reviewed',
                label: 'Revisados',
                count: stats.reviewed,
                tone: 'success',
            },
        ],
        [stats.observed, stats.reviewed, stats.total],
    );

    const columns = useMemo<DataTableColumn<ConsolidationRow>[]>(
        () => [
            {
                key: 'plate_number',
                header: 'Placa',
                cell: (item) => (
                    <div className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-sm font-semibold text-foreground">
                            {item.plate_number || 'Sin placa'}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                            {item.driver_name || 'Sin conductor'}
                        </span>
                    </div>
                ),
            },
            {
                key: 'type',
                header: 'Tipo',
                cell: (item) => (
                    <span className="text-xs uppercase text-muted-foreground">
                        {item.template?.type ?? '—'}
                    </span>
                ),
            },
            {
                key: 'period',
                header: 'Periodo',
                cell: (item) => (
                    <span className="text-xs text-muted-foreground">
                        {item.period?.name ?? '—'}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Estado',
                cell: (item) =>
                    item.coordinator_status === 'reviewed' ? (
                        <StatBadge label="Revisado" value="" variant="success" />
                    ) : (
                        <StatBadge label="Observado" value="" variant="warning" />
                    ),
            },
            {
                key: 'sent_to_coordinator_at',
                header: 'Enviado',
                cell: (item) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDateTime(item.sent_to_coordinator_at)}
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
                            label={`Acciones de ${item.plate_number}`}
                            items={[
                                {
                                    key: 'open',
                                    label:
                                        item.coordinator_status === 'observed'
                                            ? 'Responder'
                                            : 'Ver',
                                    icon:
                                        item.coordinator_status === 'observed'
                                            ? Reply
                                            : Eye,
                                    href: `/consolidados/${item.id}`,
                                },
                            ]}
                        />
                    </div>
                ),
            },
        ],
        [],
    );

    const hasFilters =
        Boolean(filters.search) || filters.status !== 'all';

    return (
        <>
            <Head title="Consolidados" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Consolidados"
                    description="Informes enviados a coordinador. Solo ves los de tus unidades si eres coordinador."
                    stats={[
                        {
                            label: 'Total',
                            value: stats.total,
                            variant: 'info',
                            icon: FileStack,
                        },
                        {
                            label: 'Observados',
                            value: stats.observed,
                            variant: 'warning',
                            icon: Eye,
                        },
                        {
                            label: 'Revisados',
                            value: stats.reviewed,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                    ]}
                />

                <DataTable
                    columns={columns}
                    data={items.data}
                    rowKey={(item) => item.id}
                    ariaLiveMessage={`${items.total} consolidados encontrados`}
                    toolbar={
                        <DataToolbar
                            search={filters.search}
                            onSearchChange={(search) =>
                                visit({ search, page: 1 })
                            }
                            placeholder="Buscar placa o conductor..."
                        >
                            <FilterChips
                                ariaLabel="Filtrar por estado"
                                value={filters.status}
                                onChange={(status) => visit({ status, page: 1 })}
                                options={statusOptions}
                            />
                        </DataToolbar>
                    }
                    footer={
                        <DataPagination
                            meta={asPaginated(items, '/consolidados')}
                            onPerPageChange={(per_page) =>
                                visit({ per_page, page: 1 })
                            }
                            preservedQuery={{
                                search: filters.search || undefined,
                                per_page: filters.per_page,
                                status:
                                    filters.status !== 'all'
                                        ? filters.status
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={ClipboardList}
                            title={
                                hasFilters
                                    ? 'Sin resultados'
                                    : 'Aún no hay consolidados'
                            }
                            description={
                                hasFilters
                                    ? 'Prueba con otro filtro o limpia la búsqueda.'
                                    : 'Cuando se envíe una inspección a coordinador, aparecerá aquí.'
                            }
                        />
                    }
                />
            </div>
        </>
    );
}

ConsolidationsIndexPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Plataforma', href: '/consolidados' },
        { title: 'Consolidados', href: '/consolidados' },
    ],
};
