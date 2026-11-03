import { usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { ParetoDeleteModal } from '@/components/pareto/pareto-delete-modal';
import { ParetoFormModal } from '@/components/pareto/pareto-form-modal';
import { ParetoHeader } from '@/components/pareto/pareto-header';
import {
    ParetoVehicleTypesModal,
    type VehicleTypeAssignment,
} from '@/components/pareto/pareto-vehicle-types-modal';
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
    vehicleTypes: VehicleTypeAssignment[];
};

export function ParetoPage() {
    const {
        items,
        stats,
        filters,
        checkTypeOptions,
        parentOptions,
        templates,
        vehicleTypes,
    } = usePage().props as unknown as PageProps;
    const { can } = useCan();

    const [formOpen, setFormOpen] = useState(false);
    const [vehicleTypesOpen, setVehicleTypesOpen] = useState(false);
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
        <div className="relative min-h-full w-full overflow-hidden">
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(30,77,140,0.12),_transparent_55%),radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.10),_transparent_45%),linear-gradient(180deg,#f4f7fb_0%,#eef3f8_48%,#f8fafc_100%)]"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)] opacity-60"
            />

            <div className="relative z-10 mx-auto flex w-full max-w-[1400px] flex-col gap-5 p-4 sm:gap-6 sm:p-6">
                <ParetoHeader
                    stats={stats}
                    onVehicleTypes={() => setVehicleTypesOpen(true)}
                    onCreate={() => {
                        if (!can('pareto.create')) {
                            return;
                        }

                        setEditing(null);
                        setFormOpen(true);
                    }}
                />

                <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/95 shadow-[0_18px_50px_-30px_rgba(15,31,58,0.45)]">
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
                </section>
            </div>

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

            {can('pareto.view') ? (
                <ParetoVehicleTypesModal
                    open={vehicleTypesOpen}
                    templates={templates ?? []}
                    vehicleTypes={vehicleTypes ?? []}
                    canEdit={can('pareto.update')}
                    onClose={() => setVehicleTypesOpen(false)}
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
