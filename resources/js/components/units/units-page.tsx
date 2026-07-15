import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { UnitDeleteModal } from '@/components/units/unit-delete-modal';
import {
    UnitDocumentsModal,
    type UnitDocumentTypeOption,
} from '@/components/units/unit-documents-modal';
import { UnitFormModal } from '@/components/units/unit-form-modal';
import { UnitImportModal } from '@/components/units/unit-import-modal';
import type { PeriodOption, CoordinatorOption } from '@/components/units/unit-form-fields';
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
    coordinatorOptions: CoordinatorOption[];
    documentTypes: UnitDocumentTypeOption[];
    flash?: {
        unit_import?: {
            imported: number;
            errors: Array<{ row: number; messages: string[] }>;
        } | null;
    };
};

export function UnitsPage() {
    const {
        units,
        stats,
        filters,
        periodOptions,
        coordinatorOptions,
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
        <div className="flex flex-col gap-4 p-4">
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
                onDocuments={openDocuments}
            />

            {can('units.create') || can('units.update') ? (
                <UnitFormModal
                    open={formOpen}
                    unit={editingUnit}
                    periodOptions={periodOptions ?? []}
                    coordinatorOptions={coordinatorOptions ?? []}
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
