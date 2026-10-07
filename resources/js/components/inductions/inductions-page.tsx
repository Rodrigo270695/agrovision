import { usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { InductionDeleteModal } from '@/components/inductions/induction-delete-modal';
import { InductionAttendeesModal } from '@/components/inductions/induction-attendees-modal';
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
import { usePendingPosts } from '@/lib/offline/use-pending-posts';

type PageProps = {
    inductions: InductionsPagination;
    stats: InductionStatsData;
    filters: InductionsFilters;
    periodOptions: PeriodOption[];
    statusOptions: StatusOption[];
    formOptions: InductionFormOptions;
};

function inductionExportHref(filters: InductionsFilters): string {
    const params = new URLSearchParams();

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    const query = params.toString();

    return query ? `/inducciones/exportar?${query}` : '/inducciones/exportar';
}

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
    const [attendeesOpen, setAttendeesOpen] = useState(false);
    const [viewingAttendees, setViewingAttendees] =
        useState<InductionItem | null>(null);
    const pendingInductions = usePendingPosts('/inducciones');
    const localInductions = useMemo<InductionItem[]>(
        () =>
            pendingInductions.map((item) => {
                const date = String(item.body.session_date ?? '');
                const time = String(item.body.start_time ?? '00:00').slice(0, 5);

                return {
                    id: item.id,
                    pending_sync: true,
                    title: String(item.body.title ?? 'Inducción'),
                    document_code: String(item.body.document_code ?? ''),
                    status: String(item.body.status ?? 'scheduled'),
                    scheduled_at: date
                        ? `${date}T${time || '00:00'}:00`
                        : new Date().toISOString(),
                    session_date: date,
                    location: String(item.body.sede ?? item.body.zone ?? ''),
                    attendees_count: 0,
                    attended_count: 0,
                };
            }),
        [pendingInductions],
    );
    const mergedInductions = useMemo<InductionsPagination>(() => {
        if (localInductions.length === 0) {
            return inductions;
        }

        return {
            ...inductions,
            data: [...localInductions, ...inductions.data],
            total: inductions.total + localInductions.length,
        };
    }, [inductions, localInductions]);
    const mergedStats = useMemo<InductionStatsData>(() => {
        const scheduled = localInductions.filter(
            (item) => item.status === 'scheduled',
        ).length;

        return {
            ...stats,
            total: stats.total + localInductions.length,
            scheduled: stats.scheduled + scheduled,
            in_progress:
                stats.in_progress +
                localInductions.filter((item) => item.status === 'in_progress')
                    .length,
        };
    }, [localInductions, stats]);

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <InductionsHeader
                stats={mergedStats}
                exportHref={inductionExportHref(filters)}
                onCreate={() => {
                    if (!can('inductions.create')) {
                        return;
                    }

                    setEditing(null);
                    setFormOpen(true);
                }}
            />

            <InductionsTable
                inductions={mergedInductions}
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
                onViewAttendees={(item) => {
                    setViewingAttendees(item);
                    setAttendeesOpen(true);
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
                            sites: [],
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

            <InductionAttendeesModal
                open={attendeesOpen}
                induction={viewingAttendees}
                onClose={() => {
                    setAttendeesOpen(false);
                    setViewingAttendees(null);
                }}
            />
        </div>
    );
}
