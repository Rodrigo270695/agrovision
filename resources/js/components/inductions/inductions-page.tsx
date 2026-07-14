import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { InductionDeleteModal } from '@/components/inductions/induction-delete-modal';
import { InductionFormModal } from '@/components/inductions/induction-form-modal';
import type { InductionFormOptions } from '@/components/inductions/induction-form-fields';
import type { PeriodOption } from '@/components/inductions/induction-form-fields';
import { InductionsHeader } from '@/components/inductions/inductions-header';
import {
    InductionsTable,
    type InductionItem,
    type InductionsFilters,
    type InductionsPagination,
    type StatusOption,
} from '@/components/inductions/inductions-table';
import type { InductionStatsData } from '@/components/inductions/inductions-stats';
import { useCan } from '@/hooks/use-can';

type PageProps = {
    inductions: InductionsPagination;
    stats: InductionStatsData;
    filters: InductionsFilters;
    periodOptions: PeriodOption[];
    statusOptions: StatusOption[];
    formOptions: InductionFormOptions;
};

export function InductionsPage() {
    const {
        inductions,
        stats,
        filters,
        periodOptions,
        statusOptions,
        formOptions,
    } = usePage().props as unknown as PageProps;
    const { can } = useCan();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<InductionItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<InductionItem | null>(null);

    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-4">
            <InductionsHeader
                stats={stats}
                onCreate={() => {
                    if (!can('inductions.create')) {
                        return;
                    }

                    setEditing(null);
                    setFormOpen(true);
                }}
            />

            <InductionsTable
                inductions={inductions}
                filters={filters}
                statusOptions={statusOptions ?? []}
                onEdit={(item) => {
                    if (!can('inductions.update')) {
                        return;
                    }

                    setEditing(item);
                    setFormOpen(true);
                }}
                onDelete={(item) => {
                    if (!can('inductions.delete')) {
                        return;
                    }

                    setDeleting(item);
                    setDeleteOpen(true);
                }}
            />

            {can('inductions.create') || can('inductions.update') ? (
                <InductionFormModal
                    open={formOpen}
                    induction={editing}
                    periodOptions={periodOptions ?? []}
                    formOptions={
                        formOptions ?? {
                            activities: [],
                            modalities: [],
                            schools: [],
                            categories: [],
                        }
                    }
                    onClose={() => {
                        setFormOpen(false);
                        setEditing(null);
                    }}
                />
            ) : null}

            {can('inductions.delete') ? (
                <InductionDeleteModal
                    open={deleteOpen}
                    induction={deleting}
                    onClose={() => {
                        setDeleteOpen(false);
                        setDeleting(null);
                    }}
                />
            ) : null}
        </div>
    );
}
