import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle2, Eye, FileStack, Package, Reply } from 'lucide-react';
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

type BatchRow = {
    id: number;
    inspected_on: string;
    status: 'sent' | 'signed';
    checklists_count: number;
    coordinator_name?: string | null;
    sent_at?: string | null;
    signed_at?: string | null;
    signer_name?: string | null;
};

type Pagination = {
    data: BatchRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

type Filters = {
    search: string;
    status: 'sent' | 'signed' | 'all';
    per_page: number;
};

type PageProps = {
    items: Pagination;
    filters: Filters;
    stats: { total: number; sent: number; signed: number };
};

function formatDay(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const [year, month, day] = value.slice(0, 10).split('-');

    return day && month && year ? `${day}/${month}/${year}` : value;
}

export default function InspectionBatchesIndexPage() {
    const { items, filters, stats } = usePage().props as unknown as PageProps;

    const visit = useCallback(
        (params: Partial<Filters> & { page?: number }) => {
            router.get(
                '/paquetes-inspeccion',
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
            { value: 'all', label: 'Todos', count: stats.total, tone: 'default' },
            {
                value: 'sent',
                label: 'Por firmar',
                count: stats.sent,
                tone: 'warning',
            },
            {
                value: 'signed',
                label: 'Firmados',
                count: stats.signed,
                tone: 'success',
            },
        ],
        [stats.sent, stats.signed, stats.total],
    );

    const columns = useMemo<DataTableColumn<BatchRow>[]>(
        () => [
            {
                key: 'date',
                header: 'Fecha',
                cell: (item) => (
                    <span className="text-sm font-semibold text-[#1a2b4c]">
                        {formatDay(item.inspected_on)}
                    </span>
                ),
            },
            {
                key: 'coordinator',
                header: 'Coordinador',
                cell: (item) => (
                    <span className="text-sm text-[#1a2b4c]">
                        {item.coordinator_name || '—'}
                    </span>
                ),
            },
            {
                key: 'count',
                header: 'Inspecciones',
                cell: (item) => (
                    <span className="text-sm tabular-nums text-[#1a2b4c]">
                        {item.checklists_count}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Estado',
                cell: (item) =>
                    item.status === 'signed' ? (
                        <StatBadge label="Firmado" value="" variant="success" />
                    ) : (
                        <StatBadge label="Por firmar" value="" variant="warning" />
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
                            label={`Acciones del paquete ${formatDay(item.inspected_on)}`}
                            items={[
                                {
                                    key: 'open',
                                    label:
                                        item.status === 'sent'
                                            ? 'Revisar y firmar'
                                            : 'Ver',
                                    icon: item.status === 'sent' ? Reply : Eye,
                                    href: `/paquetes-inspeccion/${item.id}`,
                                },
                            ]}
                        />
                    </div>
                ),
            },
        ],
        [],
    );

    const hasFilters = Boolean(filters.search) || filters.status !== 'sent';

    return (
        <>
            <Head title="Paquetes" />
            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Paquetes"
                    description="Inspecciones del mismo día, agrupadas por coordinador. Una firma cubre todo el paquete."
                    stats={[
                        {
                            label: 'Total',
                            value: stats.total,
                            variant: 'info',
                            icon: FileStack,
                        },
                        {
                            label: 'Por firmar',
                            value: stats.sent,
                            variant: 'warning',
                            icon: Package,
                        },
                        {
                            label: 'Firmados',
                            value: stats.signed,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                    ]}
                />

                <DataTable
                    columns={columns}
                    data={items.data}
                    rowKey={(item) => item.id}
                    ariaLiveMessage={`${items.total} paquetes encontrados`}
                    toolbar={
                        <DataToolbar
                            search={filters.search}
                            onSearchChange={(search) => visit({ search, page: 1 })}
                            placeholder="Buscar coordinador, placa o conductor..."
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
                            meta={asPaginated(items, '/paquetes-inspeccion')}
                            onPerPageChange={(per_page) =>
                                visit({ per_page, page: 1 })
                            }
                            preservedQuery={{
                                search: filters.search || undefined,
                                per_page: filters.per_page,
                                status:
                                    filters.status !== 'sent'
                                        ? filters.status
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Package}
                            title={
                                hasFilters
                                    ? 'Sin resultados'
                                    : 'Aún no hay paquetes'
                            }
                            description={
                                hasFilters
                                    ? 'Prueba con otro filtro o limpia la búsqueda.'
                                    : 'Desde Inspecciones, envía el paquete del día cuando la 2da inspección esté cerrada.'
                            }
                        />
                    }
                />
            </div>
        </>
    );
}

InspectionBatchesIndexPage.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Plataforma', href: '/paquetes-inspeccion' },
        { title: 'Paquetes', href: '/paquetes-inspeccion' },
    ],
};
