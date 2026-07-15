import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ParetoDeleteModal } from '@/components/pareto/pareto-delete-modal';
import { ParetoFormModal } from '@/components/pareto/pareto-form-modal';
import { ParetoHeader } from '@/components/pareto/pareto-header';
import {
    ParetoTable,
    type ParetoFilters,
    type ParetoItem,
    type ParetoPagination,
    type ParetoStats,
    type ParentOption,
} from '@/components/pareto/pareto-table';
import { useCan } from '@/hooks/use-can';

type PageProps = {
    items: ParetoPagination;
    stats: ParetoStats;
    filters: ParetoFilters;
    checkTypeOptions: { value: string; label: string }[];
    parentOptions: ParentOption[];
};

export function ParetoPage() {
    const { items, stats, filters, checkTypeOptions, parentOptions } =
        usePage().props as unknown as PageProps;
    const { can } = useCan();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ParetoItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<ParetoItem | null>(null);

    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-4">
            <ParetoHeader
                stats={stats}
                templateType={filters.template_type}
                onCreate={() => {
                    if (!can('pareto.create')) {
                        return;
                    }

                    setEditing(null);
                    setFormOpen(true);
                }}
            />

            <ParetoTable
                items={items}
                filters={filters}
                checkTypeOptions={checkTypeOptions ?? []}
                onEdit={(item) => {
                    if (!can('pareto.update')) {
                        return;
                    }

                    setEditing(item);
                    setFormOpen(true);
                }}
                onDelete={(item) => {
                    if (!can('pareto.delete')) {
                        return;
                    }

                    setDeleting(item);
                    setDeleteOpen(true);
                }}
            />

            {can('pareto.create') || can('pareto.update') ? (
                <ParetoFormModal
                    open={formOpen}
                    item={editing}
                    checkTypeOptions={checkTypeOptions ?? []}
                    parentOptions={parentOptions ?? []}
                    defaultTemplateType={
                        filters.template_type === 'all'
                            ? 'tdp'
                            : filters.template_type
                    }
                    onClose={() => {
                        setFormOpen(false);
                        setEditing(null);
                    }}
                />
            ) : null}

            {can('pareto.delete') ? (
                <ParetoDeleteModal
                    open={deleteOpen}
                    item={deleting}
                    onClose={() => {
                        setDeleteOpen(false);
                        setDeleting(null);
                    }}
                />
            ) : null}
        </div>
    );
}
