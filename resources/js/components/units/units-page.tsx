import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { UnitDeleteModal } from '@/components/units/unit-delete-modal';
import { UnitDocumentsModal } from '@/components/units/unit-documents-modal';
import type { UnitDocumentTypeOption } from '@/components/units/unit-documents-modal';
import type {
    CoordinatorOption,
    LicenseCategoryOption,
    PeriodOption,
} from '@/components/units/unit-form-fields';
import { UnitFormModal } from '@/components/units/unit-form-modal';
import { UnitImportModal } from '@/components/units/unit-import-modal';
import { UnitsHeader } from '@/components/units/units-header';
import type { UnitsStatsData } from '@/components/units/units-stats';
import { UnitsTable } from '@/components/units/units-table';
import type {
    MovementsPagination,
    UnitItem,
    UnitsFilters,
    UnitsPagination,
} from '@/components/units/units-table';
import { useCan } from '@/hooks/use-can';
import { usePendingPosts } from '@/lib/offline/use-pending-posts';

type UnitsPageProps = {
    units: UnitsPagination;
    movements?: MovementsPagination | null;
    stats: UnitsStatsData;
    filters: UnitsFilters;
    periodOptions: PeriodOption[];
    coordinatorOptions: CoordinatorOption[];
    vehicleTypeOptions: string[];
    licenseCategoryOptions: LicenseCategoryOption[];
    serviceTypeOptions: string[];
    responsibleOptions: string[];
    documentTypes: UnitDocumentTypeOption[];
    flash?: {
        unit_import?: {
            imported: number;
            created?: number;
            updated?: number;
            units_created?: number;
            deactivated?: number;
            errors: Array<{ row: number; messages: string[] }>;
        } | null;
    };
};

export function UnitsPage() {
    const {
        units,
        movements,
        stats,
        filters,
        periodOptions,
        coordinatorOptions,
        vehicleTypeOptions,
        licenseCategoryOptions,
        serviceTypeOptions,
        responsibleOptions,
        documentTypes,
        flash,
    } = usePage().props as unknown as UnitsPageProps;
    const { can } = useCan();

    const [formOpen, setFormOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingUnit, setDeletingUnit] = useState<UnitItem | null>(null);
    const [importOpen, setImportOpen] = useState(false);
    const [documentsOpen, setDocumentsOpen] = useState(false);
    const [documentsUnit, setDocumentsUnit] = useState<UnitItem | null>(null);
    const pendingUnits = usePendingPosts('/unidades');
    const localUnits = useMemo<UnitItem[]>(
        () =>
            pendingUnits.map((item) => ({
                id: item.id,
                pending_sync: true,
                period_id: Number(item.body.period_id ?? 0),
                correlative: String(item.body.correlative ?? ''),
                phone: String(item.body.phone ?? ''),
                provider: String(item.body.provider ?? ''),
                route: String(item.body.route ?? ''),
                vehicle_type: String(item.body.vehicle_type ?? ''),
                service_date: String(item.body.service_date ?? ''),
                driver_name: String(item.body.driver_name ?? ''),
                plate_number: String(item.body.plate_number ?? ''),
                responsible_person: String(item.body.responsible_person ?? ''),
                service_type: String(item.body.service_type ?? ''),
                ruc: String(item.body.ruc ?? ''),
                driver_dni: String(item.body.driver_dni ?? ''),
                category: String(item.body.category ?? ''),
                status: 'active',
                documents_count: 0,
            })),
        [pendingUnits],
    );
    const mergedUnits = useMemo<UnitsPagination>(() => {
        if (localUnits.length === 0) {
            return units;
        }

        return {
            ...units,
            data: [...localUnits, ...units.data],
            total: units.total + localUnits.length,
        };
    }, [localUnits, units]);
    const mergedStats = useMemo<UnitsStatsData>(
        () => ({
            ...stats,
            units: stats.units + localUnits.length,
            on_screen: stats.on_screen + localUnits.length,
            without_plate:
                stats.without_plate +
                localUnits.filter((unit) => !unit.plate_number).length,
        }),
        [localUnits, stats],
    );

    useEffect(() => {
        if (flash?.unit_import) {
            setImportOpen(true);
        }
    }, [flash?.unit_import]);

    useEffect(() => {
        if (!documentsUnit) {
            return;
        }

        const fresh = units.data.find((item) => item.id === documentsUnit.id);

        if (fresh) {
            setDocumentsUnit(fresh);
        }
    }, [units, documentsUnit?.id]);

    const openCreate = () => {
        if (!can('units.create')) {
            return;
        }

        setEditingUnit(null);
        setFormOpen(true);
    };

    const openEdit = (unit: UnitItem) => {
        if (!can('units.update')) {
            return;
        }

        setEditingUnit(unit);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingUnit(null);
    };

    const openDelete = (unit: UnitItem) => {
        if (!can('units.delete')) {
            return;
        }

        setDeletingUnit(unit);
        setDeleteOpen(true);
    };

    const closeDelete = () => {
        setDeleteOpen(false);
        setDeletingUnit(null);
    };

    const openDocuments = (unit: UnitItem) => {
        if (!can('units.view')) {
            return;
        }

        setDocumentsUnit(unit);
        setDocumentsOpen(true);
    };

    const closeDocuments = () => {
        setDocumentsOpen(false);
        setDocumentsUnit(null);
    };

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <UnitsHeader
                stats={mergedStats}
                filters={filters}
                onCreate={openCreate}
                onImport={() => {
                    if (can('units.create')) {
                        setImportOpen(true);
                    }
                }}
            />
            <UnitsTable
                units={mergedUnits}
                movements={movements}
                filters={filters}
                periodOptions={periodOptions ?? []}
                onEdit={openEdit}
                onDelete={openDelete}
                onDocuments={openDocuments}
            />

            {can('units.create') || can('units.update') ? (
                <UnitFormModal
                    open={formOpen}
                    unit={editingUnit}
                    periodOptions={periodOptions ?? []}
                    coordinatorOptions={coordinatorOptions ?? []}
                    vehicleTypeOptions={vehicleTypeOptions ?? []}
                    licenseCategoryOptions={licenseCategoryOptions ?? []}
                    serviceTypeOptions={serviceTypeOptions ?? []}
                    responsibleOptions={responsibleOptions ?? []}
                    onClose={closeForm}
                />
            ) : null}

            {can('units.delete') ? (
                <UnitDeleteModal
                    open={deleteOpen}
                    unit={deletingUnit}
                    onClose={closeDelete}
                />
            ) : null}

            {can('units.create') ? (
                <UnitImportModal
                    open={importOpen}
                    periodOptions={periodOptions ?? []}
                    onClose={() => setImportOpen(false)}
                />
            ) : null}

            {can('units.view') ? (
                <UnitDocumentsModal
                    open={documentsOpen}
                    unit={documentsUnit}
                    documentTypes={documentTypes ?? []}
                    onClose={closeDocuments}
                />
            ) : null}
        </div>
    );
}
