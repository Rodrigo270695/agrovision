import { usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
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
import { MUTATIONS_EVENT, listMutations } from '@/lib/offline/mutations';

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
    const [localPeriods, setLocalPeriods] = useState<PeriodItem[]>([]);

    useEffect(() => {
        let cancelled = false;

        const load = () => {
            void listMutations().then((items) => {
                if (cancelled) {
                    return;
                }

                setLocalPeriods(
                    items
                        .filter(
                            (item) =>
                                item.method === 'POST' &&
                                item.url === '/periodos',
                        )
                        .map((item) => ({
                            id: item.id,
                            pending_sync: true,
                            name: String(item.body.name ?? ''),
                            date: `${String(item.body.date ?? '')}T12:00:00`,
                            status: String(item.body.status ?? 'active'),
                            units_count: 0,
                        })),
                );
            });
        };

        load();
        window.addEventListener(MUTATIONS_EVENT, load);

        return () => {
            cancelled = true;
            window.removeEventListener(MUTATIONS_EVENT, load);
        };
    }, [periods]);

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

    const mergedPeriods = useMemo<PeriodsPagination>(() => {
        if (localPeriods.length === 0) {
            return periods;
        }

        return {
            ...periods,
            data: [...localPeriods, ...periods.data],
            total: periods.total + localPeriods.length,
        };
    }, [localPeriods, periods]);

    const mergedStats = useMemo<PeriodsStatsData>(() => {
        const extraActive = localPeriods.filter(
            (period) => period.status === 'active',
        ).length;

        return {
            ...stats,
            periods: stats.periods + localPeriods.length,
            active: stats.active + extraActive,
            inactive:
                stats.inactive + (localPeriods.length - extraActive),
            on_screen: stats.on_screen + localPeriods.length,
        };
    }, [localPeriods, stats]);

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <PeriodsHeader stats={mergedStats} onCreate={openCreate} />
            <PeriodsTable
                periods={mergedPeriods}
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
