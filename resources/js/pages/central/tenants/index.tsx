import { Head, router } from '@inertiajs/react';
import {
    Building2,
    CheckCircle2,
    Filter,
    PauseCircle,
    Plus,
    ScreenShare,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { TenantFormModal } from '@/components/central/tenant-form-modal';
import { TenantRowActions } from '@/components/central/tenant-row-actions';
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
import { Button } from '@/components/ui/button';
import { useDataTablePage } from '@/hooks/use-data-table-page';
import type { Paginated } from '@/types';

export type TenantRow = {
    id: string;
    name: string;
    status: string;
    schema: string;
    domains: string[];
    url: string;
    created_at: string | null;
};

export type TenantStatusFilter = 'todos' | 'active' | 'suspended';

export type TenantFilters = {
    search: string;
    status: TenantStatusFilter;
    sort: string | null;
    direction: 'asc' | 'desc' | null;
    per_page: number;
};

export type TenantStats = {
    total: number;
    active: number;
    suspended: number;
    matches: number;
};

type Props = {
    tenants: Paginated<TenantRow>;
    filters: TenantFilters;
    stats: TenantStats;
    modules: Record<string, string>;
};

type ModalState =
    | { type: 'idle' }
    | { type: 'create' }
    | { type: 'edit'; tenant: TenantRow };

const DEFAULT_PER_PAGE = 10;
const DEFAULT_STATUS: TenantStatusFilter = 'todos';

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

export default function CentralTenantsIndex({
    tenants: paginated,
    filters,
    stats,
    modules,
}: Props) {
    const {
        search,
        setSearch,
        isLoading,
        sort,
        setSort,
        setPerPage,
        applyFilter,
    } = useDataTablePage<{ status: TenantStatusFilter }>({
        routeUrl: '/plataforma/empresas',
        initialFilters: filters,
        only: ['tenants', 'filters', 'stats'],
        errorMessage: 'No se pudo cargar las empresas.',
        storageKey: 'gindelsi.empresas.prefs',
        defaults: {
            per_page: DEFAULT_PER_PAGE,
            sort: 'name',
            direction: 'asc',
        },
    });

    const [modal, setModal] = useState<ModalState>({ type: 'idle' });
    const closeModal = useCallback(() => setModal({ type: 'idle' }), []);
    const openCreate = useCallback(() => setModal({ type: 'create' }), []);
    const openEdit = useCallback(
        (tenant: TenantRow) => setModal({ type: 'edit', tenant }),
        [],
    );
    const enterSupport = useCallback((tenant: TenantRow) => {
        router.post(`/plataforma/empresas/${tenant.id}/entrar`);
    }, []);
    const toggleStatus = useCallback((tenant: TenantRow) => {
        const action = tenant.status === 'active' ? 'suspender' : 'activar';
        router.post(`/plataforma/empresas/${tenant.id}/${action}`, {}, {
            preserveScroll: true,
        });
    }, []);

    const statusOptions: readonly FilterChip<TenantStatusFilter>[] = useMemo(
        () => [
            { value: 'todos', label: 'Todas', count: stats.total, tone: 'default' },
            {
                value: 'active',
                label: 'Activas',
                count: stats.active,
                tone: 'success',
            },
            {
                value: 'suspended',
                label: 'Suspendidas',
                count: stats.suspended,
                tone: 'warning',
            },
        ],
        [stats.active, stats.suspended, stats.total],
    );

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.search) count += 1;
        if (filters.status !== DEFAULT_STATUS) count += 1;
        if (filters.sort && filters.sort !== 'name') count += 1;
        if (filters.per_page !== DEFAULT_PER_PAGE) count += 1;
        return count;
    }, [filters.search, filters.sort, filters.status, filters.per_page]);

    const columns = useMemo<DataTableColumn<TenantRow>[]>(
        () => [
            {
                key: 'name',
                header: 'Empresa',
                sortable: true,
                cell: (tenant) => (
                    <div className="flex min-w-0 items-center gap-2">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Building2 className="size-4" strokeWidth={2.25} />
                        </span>
                        <div className="flex min-w-0 flex-col leading-tight">
                            <span className="truncate text-sm font-semibold text-foreground">
                                {tenant.name}
                            </span>
                            <span className="truncate font-mono text-xs text-muted-foreground">
                                {tenant.id}
                            </span>
                        </div>
                    </div>
                ),
            },
            {
                key: 'schema',
                header: 'Schema',
                cell: (tenant) => (
                    <span className="font-mono text-xs text-foreground/80">
                        {tenant.schema}
                    </span>
                ),
            },
            {
                key: 'status',
                header: 'Estado',
                sortable: true,
                cell: (tenant) =>
                    tenant.status === 'active' ? (
                        <StatBadge label="Activa" value="" variant="success" />
                    ) : (
                        <StatBadge label="Suspendida" value="" variant="warning" />
                    ),
            },
            {
                key: 'domains',
                header: 'Dominios',
                cell: (tenant) => (
                    <span className="text-xs text-muted-foreground">
                        {tenant.domains.join(', ') || '—'}
                    </span>
                ),
            },
            {
                key: 'created_at',
                header: 'Creada',
                sortable: true,
                cell: (tenant) => (
                    <span className="text-xs text-muted-foreground">
                        {formatDate(tenant.created_at)}
                    </span>
                ),
            },
            {
                key: 'acciones',
                header: <span className="md:sr-only">Acciones</span>,
                align: 'right',
                showInMobile: true,
                cell: (tenant) => (
                    <div className="flex justify-end">
                        <TenantRowActions
                            tenant={tenant}
                            onEdit={openEdit}
                            onEnterSupport={enterSupport}
                            onToggleStatus={toggleStatus}
                        />
                    </div>
                ),
                className: 'w-12',
            },
        ],
        [enterSupport, openEdit, toggleStatus],
    );

    return (
        <>
            <Head title="Empresas" />

            <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
                <PageHeader
                    title="Empresas"
                    description="Administra los tenants de Gindelsi: crear, suspender y entrar como soporte."
                    stats={[
                        {
                            label: 'Total',
                            value: stats.total,
                            variant: 'info',
                            icon: Building2,
                        },
                        {
                            label: 'Activas',
                            value: stats.active,
                            variant: 'success',
                            icon: CheckCircle2,
                        },
                        {
                            label: 'Suspendidas',
                            value: stats.suspended,
                            variant: 'warning',
                            icon: PauseCircle,
                        },
                        {
                            label: 'Filtros',
                            value: activeFiltersCount,
                            variant: 'warning',
                            icon: Filter,
                        },
                        {
                            label: 'Coincidencias',
                            value: stats.matches,
                            variant: 'primary',
                            icon: ScreenShare,
                        },
                    ]}
                    action={
                        <Button
                            type="button"
                            onClick={openCreate}
                            className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            <Plus className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">Nueva empresa</span>
                            <span className="sm:hidden">Nueva</span>
                        </Button>
                    }
                />

                <DataTable
                    columns={columns}
                    data={paginated.data}
                    rowKey={(tenant) => tenant.id}
                    sort={sort}
                    onSortChange={setSort}
                    isLoading={isLoading}
                    ariaLiveMessage={`${stats.matches} empresas encontradas`}
                    toolbar={
                        <DataToolbar
                            search={search}
                            onSearchChange={setSearch}
                            isSearching={isLoading}
                            placeholder="Buscar por nombre, slug o dominio..."
                        >
                            <FilterChips
                                ariaLabel="Filtrar por estado"
                                value={filters.status}
                                onChange={(status) => applyFilter({ status })}
                                options={statusOptions}
                            />
                        </DataToolbar>
                    }
                    footer={
                        <DataPagination
                            meta={paginated}
                            onPerPageChange={setPerPage}
                            preservedQuery={{
                                search: filters.search || undefined,
                                per_page: filters.per_page,
                                sort: filters.sort ?? undefined,
                                direction: filters.direction ?? undefined,
                                status:
                                    filters.status !== DEFAULT_STATUS
                                        ? filters.status
                                        : undefined,
                            }}
                        />
                    }
                    emptyState={
                        <EmptyState
                            icon={Building2}
                            title={
                                activeFiltersCount > 0
                                    ? 'Sin resultados'
                                    : 'Aún no hay empresas'
                            }
                            description={
                                activeFiltersCount > 0
                                    ? 'Prueba con otro filtro o limpia la búsqueda.'
                                    : 'Crea la primera empresa o adopta Agrovision.'
                            }
                            action={
                                activeFiltersCount === 0 ? (
                                    <Button
                                        type="button"
                                        onClick={openCreate}
                                        className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                                    >
                                        <Plus className="size-4" strokeWidth={2.5} />
                                        Crear empresa
                                    </Button>
                                ) : undefined
                            }
                        />
                    }
                />
            </div>

            <TenantFormModal
                open={modal.type === 'create' || modal.type === 'edit'}
                tenant={modal.type === 'edit' ? modal.tenant : null}
                modules={modules}
                onClose={closeModal}
            />
        </>
    );
}

CentralTenantsIndex.layout = {
    breadcrumbs: [
        { title: 'Panel', href: '/plataforma' },
        { title: 'Empresas', href: '/plataforma/empresas' },
    ],
};
