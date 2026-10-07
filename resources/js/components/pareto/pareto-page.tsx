import { usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ParetoDeleteModal } from '@/components/pareto/pareto-delete-modal';
import { ParetoFormModal } from '@/components/pareto/pareto-form-modal';
import { ParetoHeader } from '@/components/pareto/pareto-header';
import {
    ParetoTable,
    type ParetoFilters,
    type ParetoItem,
    type ParetoPagination,
    type ParetoStats,
    type ParetoTemplateOption,
    type ParentOption,
} from '@/components/pareto/pareto-table';
import { useCan } from '@/hooks/use-can';
import { usePendingPosts } from '@/lib/offline/use-pending-posts';

type PageProps = {
    items: ParetoPagination;
    stats: ParetoStats;
    filters: ParetoFilters;
    checkTypeOptions: { value: string; label: string }[];
    parentOptions: ParentOption[];
    templates: ParetoTemplateOption[];
};

export function ParetoPage() {
    const { items, stats, filters, checkTypeOptions, parentOptions, templates } =
        usePage().props as unknown as PageProps;
    const { can } = useCan();

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<ParetoItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<ParetoItem | null>(null);
    const pendingItems = usePendingPosts('/pareto');
    const localItems = useMemo<ParetoItem[]>(
        () =>
            pendingItems.map((item) => ({
                id: item.id,
                pending_sync: true,
                template_type: String(item.body.template_type ?? ''),
                parent_id:
                    item.body.parent_id == null
                        ? null
                        : Number(item.body.parent_id),
                item_number: String(item.body.item_number ?? ''),
                label: String(item.body.label ?? ''),
                sort_order: Number(item.body.sort_order ?? 0),
                check_type: String(item.body.check_type ?? 'observation'),
                weight: Number(item.body.weight ?? 0),
                is_active: item.body.is_active !== false,
                allows_photo: Boolean(item.body.allows_photo),
            })),
        [pendingItems],
    );
    const mergedItems = useMemo<ParetoPagination>(() => {
        if (localItems.length === 0) {
            return items;
        }

        return {
            ...items,
            data: [...localItems, ...items.data],
            total: items.total + localItems.length,
        };
    }, [items, localItems]);

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <ParetoHeader
                stats={stats}
                onCreate={() => {
                    if (!can('pareto.create')) {
                        return;
                    }

                    setEditing(null);
                    setFormOpen(true);
                }}
            />

            <ParetoTable
                items={mergedItems}
                filters={filters}
                templates={templates ?? []}
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
                    templates={templates ?? []}
                    defaultTemplateType={
                        filters.template_type === 'all'
                            ? (templates?.[0]?.value ?? 'tdp')
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
