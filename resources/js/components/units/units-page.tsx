import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { UnitDeleteModal } from '@/components/units/unit-delete-modal';
import { UnitFormModal } from '@/components/units/unit-form-modal';
import { UnitImportModal } from '@/components/units/unit-import-modal';
import type { PeriodOption } from '@/components/units/unit-form-fields';
import { UnitsHeader } from '@/components/units/units-header';
import {
    UnitsTable,
    type UnitItem,
    type UnitsFilters,
    type UnitsPagination,
} from '@/components/units/units-table';
import type { UnitsStatsData } from '@/components/units/units-stats';
import { useCan } from '@/hooks/use-can';

type UnitsPageProps = {
    units: UnitsPagination;
    stats: UnitsStatsData;
    filters: UnitsFilters;
    periodOptions: PeriodOption[];
    flash?: {
        unit_import?: {
            imported: number;
            errors: Array<{ row: number; messages: string[] }>;
        } | null;
    };
};

export function UnitsPage() {
    const { units, stats, filters, periodOptions, flash } = usePage()
        .props as unknown as UnitsPageProps;
    const { can } = useCan();

    const [formOpen, setFormOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<UnitItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingUnit, setDeletingUnit] = useState<UnitItem | null>(null);
    const [importOpen, setImportOpen] = useState(false);

    useEffect(() => {
        if (flash?.unit_import) {
            setImportOpen(true);
        }
    }, [flash?.unit_import]);

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

    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-4">
            <UnitsHeader
                stats={stats}
                filters={filters}
                onCreate={openCreate}
                onImport={() => {
                    if (can('units.create')) {
                        setImportOpen(true);
                    }
                }}
            />
            <UnitsTable
                units={units}
                filters={filters}
                periodOptions={periodOptions ?? []}
                onEdit={openEdit}
                onDelete={openDelete}
            />

            {can('units.create') || can('units.update') ? (
                <UnitFormModal
                    open={formOpen}
                    unit={editingUnit}
                    periodOptions={periodOptions ?? []}
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
        </div>
    );
}
