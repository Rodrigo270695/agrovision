import { Link, router, usePage } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { InductionDeleteModal } from '@/components/inductions/induction-delete-modal';
import { InductionAttendeesModal } from '@/components/inductions/induction-attendees-modal';
import { InductionFormModal } from '@/components/inductions/induction-form-modal';
import {
    InductionFormatsModal,
    type InductionFormats,
} from '@/components/inductions/induction-formats-modal';
import {
    InductionShowPage,
    type InductionShowProps,
} from '@/components/inductions/induction-show-page';
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
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { prefetchInductionShows } from '@/lib/offline/induction-cache';
import { isBrowserOnline } from '@/lib/offline/ids';
import { getInductionSnapshot } from '@/lib/offline/store';
import { usePendingPosts } from '@/lib/offline/use-pending-posts';

type CatalogType = {
    slug: string;
    title: string;
    short: string;
    activity: string;
    activity_label: string;
};

type PageProps = {
    catalogType: CatalogType;
    inductions: InductionsPagination;
    stats: InductionStatsData;
    filters: InductionsFilters;
    periodOptions: PeriodOption[];
    statusOptions: StatusOption[];
    formOptions: InductionFormOptions;
    formats: InductionFormats;
};

function inductionExportHref(
    filters: InductionsFilters,
    typeSlug?: string,
): string {
    const params = new URLSearchParams();

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (typeSlug) {
        params.set('induction_type', typeSlug);
    } else if (filters.activity) {
        params.set('activity', filters.activity);
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    if (!filters.date_from && !filters.date_to) {
        params.set('all_dates', '1');
    }

    const query = params.toString();

    return query ? `/inducciones/exportar?${query}` : '/inducciones/exportar';
}

export function InductionsPage() {
    const {
        catalogType,
        inductions,
        stats,
        filters,
        periodOptions,
        statusOptions,
        formOptions,
        formats,
    } = usePage().props as unknown as PageProps;
    const page = usePage();
    const { can } = useCan();
    const listBasePath = `/inducciones/tipos/${catalogType.slug}`;
    const [localShow, setLocalShow] = useState<InductionShowProps | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [formatsOpen, setFormatsOpen] = useState(false);
    const [editing, setEditing] = useState<InductionItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<InductionItem | null>(null);
    const [copyTarget, setCopyTarget] = useState<InductionItem | null>(null);
    const [attendeesOpen, setAttendeesOpen] = useState(false);
    const [viewingAttendees, setViewingAttendees] =
        useState<InductionItem | null>(null);
    const pendingInductions = usePendingPosts('/inducciones');
    const localInductions = useMemo<InductionItem[]>(
        () =>
            pendingInductions
                .filter((item) => {
                    const type = String(item.body.induction_type ?? '');

                    return type === '' || type === catalogType.slug;
                })
                .map((item) => {
                    const date = String(item.body.session_date ?? '');
                    const time = String(item.body.start_time ?? '00:00').slice(0, 5);

                    return {
                        id: item.id,
                        pending_sync: true,
                        induction_type: String(
                            item.body.induction_type ?? catalogType.slug,
                        ),
                        title: String(item.body.title ?? catalogType.title),
                        document_code: String(item.body.document_code ?? ''),
                        status: String(item.body.status ?? 'scheduled'),
                        scheduled_at: date
                            ? `${date}T${time || '00:00'}:00`
                            : new Date().toISOString(),
                        session_date: date,
                        location: String(item.body.sede ?? item.body.zone ?? ''),
                        sede: String(item.body.sede ?? '') || null,
                        lugar: String(item.body.zone ?? '') || null,
                        zone: String(item.body.zone ?? '') || null,
                        attendees_count: 0,
                        attended_count: 0,
                    };
                }),
        [pendingInductions, catalogType],
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

    useEffect(() => {
        void prefetchInductionShows(
            inductions.data.map((item) => item.id),
            page.version,
        );
    }, [inductions.data, page.version]);

    const openSavedInduction = async (id: number | string) => {
        const saved = await getInductionSnapshot(id);

        if (!saved || !('induction' in saved)) {
            toast.error(
                'Esta inducción no está en el teléfono. Ábrela con internet una vez.',
            );

            return;
        }

        setLocalShow(saved as unknown as InductionShowProps);
    };

    const openInduction = (item: InductionItem) => {
        if (item.pending_sync) {
            toast.info('Esta inducción se guarda al reconectar.');

            return;
        }

        if (!isBrowserOnline()) {
            void openSavedInduction(item.id);

            return;
        }

        router.visit(`/inducciones/${item.id}`, {
            onHttpException: (response) => {
                const data = response.data;

                if (typeof data !== 'string' || !data.includes('Sin conexión')) {
                    return;
                }

                void openSavedInduction(item.id);

                return false;
            },
            onNetworkError: () => {
                void openSavedInduction(item.id);

                return false;
            },
        });
    };

    if (localShow) {
        return (
            <InductionShowPage
                snapshot={localShow}
                onBack={() => setLocalShow(null)}
            />
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <InductionsHeader
                title={`Paquetes · ${catalogType.short}`}
                description={`${catalogType.title}. Cada paquete es una sesión por fecha; ahí cargas los asistentes.`}
                createLabel="Nueva sesión"
                stats={mergedStats}
                exportHref={inductionExportHref(filters, catalogType.slug)}
                onCreate={() => {
                    if (!can('inductions.create')) {
                        return;
                    }

                    setEditing(null);
                    setFormOpen(true);
                }}
                onFormats={() => setFormatsOpen(true)}
                leadingAction={
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="cursor-pointer gap-2 border-[#c5d5e6] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                    >
                        <Link href="/inducciones">
                            <ArrowLeft className="size-4" />
                            Catálogo
                        </Link>
                    </Button>
                }
            />
            <InductionFormatsModal
                open={formatsOpen}
                formats={formats}
                onClose={() => setFormatsOpen(false)}
            />

            <InductionsTable
                inductions={mergedInductions}
                filters={filters}
                statusOptions={statusOptions ?? []}
                activityOptions={formOptions?.activities ?? []}
                listBasePath={listBasePath}
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
                onCopy={(item) => {
                    if (!can('inductions.duplicate') || item.pending_sync || item.status !== 'closed') {
                        return;
                    }

                    setCopyTarget(item);
                }}
                onOpen={(item) => {
                    void openInduction(item);
                }}
                onViewAttendees={(item) => {
                    setViewingAttendees(item);
                    setAttendeesOpen(true);
                }}
            />

            <InductionFormModal
                open={copyTarget !== null}
                copying
                induction={copyTarget}
                lockedType={catalogType.slug}
                periodOptions={periodOptions ?? []}
                formOptions={
                    formOptions ?? {
                        types: [],
                        activities: [],
                        modalities: [],
                        schools: [],
                        categories: [],
                        sites: [],
                    }
                }
                onClose={() => setCopyTarget(null)}
            />

            {can('inductions.create') || can('inductions.update') ? (
                <InductionFormModal
                    open={formOpen}
                    induction={editing}
                    lockedType={catalogType.slug}
                    periodOptions={periodOptions ?? []}
                    formOptions={
                        formOptions ?? {
                            types: [],
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
