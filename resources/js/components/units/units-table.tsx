import { FileStack, Pencil, Trash2 } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useCallback } from 'react';
import {
    PeriodFilterSelect,
    type PeriodFilterOption,
} from '@/components/shared/period-filter-select';
import { TablePagination } from '@/components/shared/table-pagination';
import { TableSearchFilter } from '@/components/shared/table-search-filter';
import { DocumentExpiryBadge } from '@/components/units/document-expiry-badge';
import { DocumentsProgressBar } from '@/components/units/documents-progress-bar';
import type { UnitDocumentItem } from '@/components/units/unit-documents-modal';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import {
    getWorstDocumentExpiry,
    unitExpiryRowClass,
} from '@/lib/document-expiry';
import { cn } from '@/lib/utils';

export type UnitItem = {
    id: number;
    period_id: number;
    correlative: string;
    phone?: string | null;
    email?: string | null;
    provider: string;
    route?: string | null;
    vehicle_type?: string | null;
    service_date?: string | null;
    driver_name?: string | null;
    plate_number?: string | null;
    responsible_person?: string | null;
    service_type?: string | null;
    ruc?: string | null;
    driver_dni?: string | null;
    category?: string | null;
    coordinator_id?: number | null;
    coordinatorUser?: {
        id: number;
        name: string;
        email?: string | null;
    } | null;
    documents?: UnitDocumentItem[];
    documents_count?: number;
    documents_progress?: {
        done: number;
        total: number;
        percent: number;
        types?: Array<{
            value: string;
            label: string;
            uploaded: boolean;
        }>;
    };
    created_at?: string | null;
    period?: {
        id: number;
        name: string;
        status?: string;
        date?: string;
    } | null;
};

export type UnitsPagination = {
    data: UnitItem[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
};

export type UnitsFilters = {
    search: string;
    period_id?: number | null;
    sort:
        | 'correlative'
        | 'provider'
        | 'plate_number'
        | 'driver_name'
        | 'vehicle_type'
        | 'service_date'
        | 'created_at';
    direction: 'asc' | 'desc';
    per_page: number;
};

type Props = {
    units: UnitsPagination;
    filters: UnitsFilters;
    periodOptions: PeriodFilterOption[];
    onEdit: (unit: UnitItem) => void;
    onDelete: (unit: UnitItem) => void;
    onDocuments: (unit: UnitItem) => void;
};

type SortKey = UnitsFilters['sort'];

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

function formatPeriodLabel(
    period?: UnitItem['period'],
    empty = '—',
): string {
    if (!period?.name) {
        return empty;
    }

    const periodDate = formatDate(period.date);

    return periodDate === '—'
        ? period.name
        : `${period.name} · ${periodDate}`;
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

function UnitActions({
    unit,
    onEdit,
    onDelete,
    onDocuments,
    className,
}: {
    unit: UnitItem;
    onEdit: (unit: UnitItem) => void;
    onDelete: (unit: UnitItem) => void;
    onDocuments: (unit: UnitItem) => void;
    className?: string;
}) {
    const { can } = useCan();
    const canView = can('units.view');
    const canUpdate = can('units.update');
    const canDelete = can('units.delete');

    if (!canView && !canUpdate && !canDelete) {
        return null;
    }

    const docsCount = unit.documents_count ?? unit.documents?.length ?? 0;

    return (
        <div className={cn('flex items-center gap-0.5', className)}>
            {canView ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDocuments(unit)}
                    className="relative size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                    aria-label={`Documentos de ${unit.correlative}`}
                    title="Documentos"
                >
                    <FileStack className="size-3.5" />
                    {docsCount > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full bg-[#1a2b4c] text-[8px] font-bold text-white">
                            {docsCount > 9 ? '9+' : docsCount}
                        </span>
                    ) : null}
                </Button>
            ) : null}
            {canUpdate ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(unit)}
                    className="size-7 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                    aria-label={`Editar ${unit.correlative}`}
                >
                    <Pencil className="size-3.5" />
                </Button>
            ) : null}
            {canDelete ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(unit)}
                    className="size-7 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700"
                    aria-label={`Eliminar ${unit.correlative}`}
                >
                    <Trash2 className="size-3.5" />
                </Button>
            ) : null}
        </div>
    );
}

export function UnitsTable({
    units,
    filters,
    periodOptions,
    onEdit,
    onDelete,
    onDocuments,
}: Props) {
    const visit = useCallback(
        (params: Partial<UnitsFilters> & { page?: number }) => {
            const nextPeriodId = Object.prototype.hasOwnProperty.call(
                params,
                'period_id',
            )
                ? params.period_id
                : filters.period_id;

            router.get(
                '/unidades',
                {
                    search: params.search ?? filters.search,
                    ...(nextPeriodId ? { period_id: nextPeriodId } : {}),
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
        key: SortKey | 'period' | 'coordinator' | 'documents';
        label: string;
        className?: string;
        sortable?: boolean;
    }> = [
        { key: 'correlative', label: 'Correlativo', sortable: true },
        { key: 'period', label: 'Periodo', sortable: false },
        { key: 'plate_number', label: 'Placa', sortable: true },
        { key: 'driver_name', label: 'Conductor', sortable: true },
        { key: 'vehicle_type', label: 'Vehículo', sortable: true },
        { key: 'provider', label: 'Proveedor', sortable: true },
        { key: 'coordinator', label: 'Coordinador', sortable: false },
        {
            key: 'documents',
            label: 'Docs',
            className: 'min-w-[8.5rem]',
            sortable: false,
        },
        {
            key: 'service_date',
            label: 'Fecha',
            className: 'text-center',
            sortable: true,
        },
    ];

    return (
        <div className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
            <div className="flex flex-col gap-2.5 border-b border-[#e2eaf3] px-3 py-2.5 sm:flex-row sm:items-center sm:px-4">
                <TableSearchFilter
                    value={filters.search}
                    onChange={(search) => visit({ search, page: 1 })}
                    placeholder="Buscar correlativo, placa, conductor, correo..."
                    className="max-w-none sm:max-w-sm"
                />
                <PeriodFilterSelect
                    value={filters.period_id}
                    options={periodOptions}
                    onChange={(periodId) =>
                        visit({ period_id: periodId, page: 1 })
                    }
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
                                    {header.sortable !== false &&
                                    header.key !== 'period' &&
                                    header.key !== 'coordinator' &&
                                    header.key !== 'documents' ? (
                                        <button
                                            type="button"
                                            onClick={() =>
                                                toggleSort(header.key as SortKey)
                                            }
                                            className={cn(
                                                'inline-flex cursor-pointer items-center font-semibold hover:opacity-90',
                                                header.className?.includes(
                                                    'text-center',
                                                ) && 'w-full justify-center',
                                            )}
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
                                        header.label
                                    )}
                                </th>
                            ))}
                            <th
                                className="w-20 px-3 py-2"
                                aria-label="Acciones"
                            />
                        </tr>
                    </thead>
                    <tbody>
                        {units.data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={10}
                                    className="px-3 py-10 text-center text-[#6b8ead]"
                                >
                                    No se encontraron unidades.
                                </td>
                            </tr>
                        ) : (
                            units.data.map((unit, index) => {
                                const expiry = getWorstDocumentExpiry(
                                    unit.documents ?? [],
                                );

                                return (
                                <tr
                                    key={unit.id}
                                    className={cn(
                                        'border-b border-[#eef2f7] last:border-0',
                                        index % 2 === 1 && 'bg-[#f8fafc]',
                                        unitExpiryRowClass(expiry.level),
                                    )}
                                >
                                    <td className="px-3 py-1.5 font-medium text-[#1a2b4c]">
                                        {unit.correlative}
                                    </td>
                                    <td className="px-3 py-1.5 text-[#5a7390]">
                                        {formatPeriodLabel(unit.period)}
                                    </td>
                                    <td className="px-3 py-1.5 text-[#5a7390]">
                                        {unit.plate_number || '—'}
                                    </td>
                                    <td className="max-w-[12rem] truncate px-3 py-1.5 text-[#5a7390]">
                                        {unit.driver_name || '—'}
                                    </td>
                                    <td className="px-3 py-1.5 text-[#5a7390]">
                                        {unit.vehicle_type || '—'}
                                    </td>
                                    <td className="max-w-[12rem] truncate px-3 py-1.5 text-[#5a7390]">
                                        {unit.provider}
                                    </td>
                                    <td className="max-w-[12rem] truncate px-3 py-1.5 text-[#5a7390]">
                                        {unit.coordinatorUser?.name || '—'}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <div className="flex flex-col gap-1">
                                            <DocumentsProgressBar
                                                progress={
                                                    unit.documents_progress ?? {
                                                        done: 0,
                                                        total: 6,
                                                        percent: 0,
                                                    }
                                                }
                                            />
                                            <DocumentExpiryBadge
                                                info={expiry}
                                                compact
                                            />
                                        </div>
                                    </td>
                                    <td className="px-3 py-1.5 text-center text-[#5a7390]">
                                        {formatDate(unit.service_date)}
                                    </td>
                                    <td className="px-3 py-1.5">
                                        <UnitActions
                                            unit={unit}
                                            onEdit={onEdit}
                                            onDelete={onDelete}
                                            onDocuments={onDocuments}
                                            className="justify-end"
                                        />
                                    </td>
                                </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="space-y-2.5 p-3 md:hidden">
                {units.data.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[#6b8ead]">
                        No se encontraron unidades.
                    </p>
                ) : (
                    units.data.map((unit) => {
                        const expiry = getWorstDocumentExpiry(
                            unit.documents ?? [],
                        );

                        return (
                        <article
                            key={unit.id}
                            className={cn(
                                'rounded-xl border border-[#e2eaf3] bg-white p-3.5 shadow-sm',
                                unitExpiryRowClass(expiry.level),
                                (expiry.level === 'warning' ||
                                    expiry.level === 'danger' ||
                                    expiry.level === 'expired') &&
                                    'border-[#e8dcc8]',
                            )}
                        >
                            <h3 className="mb-0.5 break-words text-sm font-semibold text-[#1a2b4c]">
                                {unit.correlative}
                            </h3>
                            <p className="mb-2 text-xs text-[#5a7390]">
                                {formatPeriodLabel(unit.period, 'Sin periodo')} ·{' '}
                                {unit.plate_number || 'Sin placa'} ·{' '}
                                {unit.vehicle_type || '—'}
                            </p>
                            <dl className="mb-3 grid grid-cols-2 gap-2 text-sm">
                                <div className="col-span-2">
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Conductor
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {unit.driver_name || '—'}
                                    </dd>
                                </div>
                                <div className="col-span-2">
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Coordinador
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {unit.coordinatorUser?.name || '—'}
                                    </dd>
                                </div>
                                <div className="col-span-2">
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Documentos
                                    </dt>
                                    <dd className="mt-1 space-y-1">
                                        <DocumentsProgressBar
                                            progress={
                                                unit.documents_progress ?? {
                                                    done: 0,
                                                    total: 6,
                                                    percent: 0,
                                                }
                                            }
                                        />
                                        <DocumentExpiryBadge info={expiry} />
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Fecha
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {formatDate(unit.service_date)}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-[11px] text-[#6b8ead]">
                                        Ruta
                                    </dt>
                                    <dd className="text-xs font-medium text-[#1a2b4c]">
                                        {unit.route || '—'}
                                    </dd>
                                </div>
                            </dl>
                            <div className="flex justify-end border-t border-[#eef2f7] pt-2">
                                <UnitActions
                                    unit={unit}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onDocuments={onDocuments}
                                />
                            </div>
                        </article>
                        );
                    })
                )}
            </div>

            <TablePagination
                meta={{
                    from: units.from,
                    to: units.to,
                    total: units.total,
                    current_page: units.current_page,
                    last_page: units.last_page,
                    per_page: units.per_page,
                }}
                onPageChange={(page) => visit({ page })}
                onPerPageChange={(per_page) => visit({ per_page, page: 1 })}
            />
        </div>
    );
}
