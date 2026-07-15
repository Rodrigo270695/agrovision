import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PeriodDeleteModal } from '@/components/periods/period-delete-modal';
import { PeriodFormModal } from '@/components/periods/period-form-modal';
import { PeriodsHeader } from '@/components/periods/periods-header';
import {
    PeriodsTable,
    type PeriodItem,
    type PeriodsFilters,
    type PeriodsPagination,
} from '@/components/periods/periods-table';
import type { PeriodsStatsData } from '@/components/periods/periods-stats';
import { useCan } from '@/hooks/use-can';

type PeriodsPageProps = {
    periods: PeriodsPagination;
    stats: PeriodsStatsData;
    filters: PeriodsFilters;
};

export function PeriodsPage() {
    const { periods, stats, filters } = usePage()
        .props as unknown as PeriodsPageProps;
    const { can } = useCan();

    const [formOpen, setFormOpen] = useState(false);
    const [editingPeriod, setEditingPeriod] = useState<PeriodItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deletingPeriod, setDeletingPeriod] = useState<PeriodItem | null>(
        null,
    );

    const openCreate = () => {
        if (!can('periods.create')) {
            return;
        }

        setEditingPeriod(null);
        setFormOpen(true);
    };

    const openEdit = (period: PeriodItem) => {
        if (!can('periods.update')) {
            return;
        }

        setEditingPeriod(period);
        setFormOpen(true);
    };

    const closeForm = () => {
        setFormOpen(false);
        setEditingPeriod(null);
    };

    const openDelete = (period: PeriodItem) => {
        if (!can('periods.delete')) {
            return;
        }

        setDeletingPeriod(period);
        setDeleteOpen(true);
    };

    const closeDelete = () => {
        setDeleteOpen(false);
        setDeletingPeriod(null);
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <PeriodsHeader stats={stats} onCreate={openCreate} />
            <PeriodsTable
                periods={periods}
                filters={filters}
                onEdit={openEdit}
                onDelete={openDelete}
            />

            {can('periods.create') || can('periods.update') ? (
                <PeriodFormModal
                    open={formOpen}
                    period={editingPeriod}
                    onClose={closeForm}
                />
            ) : null}

            {can('periods.delete') ? (
                <PeriodDeleteModal
                    open={deleteOpen}
                    period={deletingPeriod}
                    onClose={closeDelete}
                />
            ) : null}
        </div>
    );
}
