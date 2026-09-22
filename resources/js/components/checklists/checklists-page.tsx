import { router, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ChecklistCreateModal } from '@/components/checklists/checklist-create-modal';
import type {
    ActiveUnitOption,
    ChecklistTemplateOption,
} from '@/components/checklists/checklist-create-modal';
import { ChecklistDeleteModal } from '@/components/checklists/checklist-delete-modal';
import { ChecklistEditForm, type ChecklistFormData } from '@/components/checklists/checklist-edit-form';
import { ChecklistPdfPreviewModal } from '@/components/checklists/checklist-pdf-preview-modal';
import { ChecklistsHeader } from '@/components/checklists/checklists-header';
import type { ChecklistsStatsData } from '@/components/checklists/checklists-stats';
import {
    ChecklistsTable,
    type ChecklistItemRow,
    type ChecklistsFilters,
    type ChecklistsPagination,
} from '@/components/checklists/checklists-table';
import { useCan } from '@/hooks/use-can';
import { isBrowserOnline, isLocalChecklistId } from '@/lib/offline/ids';
import type { OfflineCatalogTemplate } from '@/lib/offline/db';
import {
    deleteLocalDraft,
    draftToRow,
    getEditSnapshot,
    listLocalDrafts,
    saveIndexSnapshot,
} from '@/lib/offline/store';

type PageProps = {
    checklists: ChecklistsPagination;
    stats: ChecklistsStatsData;
    filters: ChecklistsFilters;
    templates: ChecklistTemplateOption[];
    activeUnits: ActiveUnitOption[];
    offlineCatalog?: OfflineCatalogTemplate[];
};

function prefetchInspectionEdits(
    rows: ChecklistItemRow[],
    version: string | null | undefined,
): void {
    if (!isBrowserOnline()) {
        return;
    }

    rows
        .filter((row) => typeof row.id === 'number')
        .slice(0, 8)
        .forEach((row) => {
            void fetch(`/inspecciones/${row.id}/editar`, {
                credentials: 'same-origin',
                headers: {
                    Accept: 'text/html, application/xhtml+xml',
                    'X-Inertia': 'true',
                    'X-Inertia-Version': version ?? '',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            }).catch(() => undefined);
        });
}

export function ChecklistsPage() {
    const page = usePage();
    const { checklists, stats, filters, templates, activeUnits, offlineCatalog } =
        page.props as unknown as PageProps;
    const { can } = useCan();

    const [createOpen, setCreateOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<ChecklistItemRow | null>(null);
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfChecklist, setPdfChecklist] = useState<ChecklistItemRow | null>(
        null,
    );
    const [localRows, setLocalRows] = useState<ChecklistItemRow[]>([]);
    const [localEditor, setLocalEditor] = useState<ChecklistFormData | null>(null);

    useEffect(() => {
        void saveIndexSnapshot({
            checklists,
            stats,
            filters,
            templates: templates ?? [],
            activeUnits: activeUnits ?? [],
            catalog: offlineCatalog ?? [],
        });
        prefetchInspectionEdits(checklists.data, page.version);
    }, [activeUnits, checklists, filters, offlineCatalog, page.version, stats, templates]);

    useEffect(() => {
        let cancelled = false;

        void listLocalDrafts().then((drafts) => {
            if (!cancelled) {
                setLocalRows(drafts.map(draftToRow));
            }
        });

        return () => {
            cancelled = true;
        };
    }, [checklists, localEditor]);

    const mergedChecklists = useMemo<ChecklistsPagination>(() => {
        if (localRows.length === 0) {
            return checklists;
        }

        const serverIds = new Set(checklists.data.map((row) => String(row.id)));
        const extras = localRows.filter((row) => !serverIds.has(String(row.id)));

        return {
            ...checklists,
            data: [...extras, ...checklists.data],
            total: checklists.total + extras.length,
        };
    }, [checklists, localRows]);

    const mergedStats = useMemo<ChecklistsStatsData>(() => {
        const extra = localRows.length;

        return {
            ...stats,
            total: stats.total + extra,
            draft: stats.draft + extra,
            on_screen: stats.on_screen + extra,
        };
    }, [localRows.length, stats]);

    const openEditor = async (item: ChecklistItemRow) => {
        if (isLocalChecklistId(item.id) || !isBrowserOnline()) {
            const snapshot = await getEditSnapshot(item.id);

            if (!snapshot) {
                toast.error(
                    'Esta inspección no está en el dispositivo. Ábrela con conexión una vez.',
                );

                return;
            }

            setLocalEditor(snapshot);

            return;
        }

        router.visit(`/inspecciones/${item.id}/editar`);
    };

    if (localEditor) {
        return (
            <div className="flex flex-col gap-4 p-4">
                <ChecklistEditForm
                    checklist={localEditor}
                    onBack={() => setLocalEditor(null)}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <ChecklistsHeader
                stats={mergedStats}
                onCreate={() => {
                    if (can('checklists.create')) {
                        setCreateOpen(true);
                    }
                }}
            />

            <ChecklistsTable
                checklists={mergedChecklists}
                filters={filters}
                onEdit={(item) => {
                    if (can('checklists.update') || item.sealed_at) {
                        void openEditor(item);
                    }
                }}
                onPreviewPdf={(item) => {
                    if (!can('checklists.view') || typeof item.id !== 'number') {
                        return;
                    }

                    setPdfChecklist(item);
                    setPdfOpen(true);
                }}
                onDelete={(item) => {
                    if (!can('checklists.delete')) {
                        return;
                    }

                    if (isLocalChecklistId(item.id)) {
                        void deleteLocalDraft(item.id).then(() => {
                            setLocalRows((prev) =>
                                prev.filter((row) => row.id !== item.id),
                            );
                            toast.success('Borrador local eliminado.');
                        });

                        return;
                    }

                    setDeleting(item);
                    setDeleteOpen(true);
                }}
            />

            {can('checklists.create') ? (
                <ChecklistCreateModal
                    open={createOpen}
                    templates={templates ?? []}
                    activeUnits={activeUnits ?? []}
                    catalog={offlineCatalog ?? []}
                    onClose={() => setCreateOpen(false)}
                    onCreatedOffline={(draft) => {
                        setLocalRows((prev) => [draftToRow(draft), ...prev]);
                        setLocalEditor(draft);
                    }}
                />
            ) : null}

            {can('checklists.delete') ? (
                <ChecklistDeleteModal
                    open={deleteOpen}
                    checklist={deleting}
                    onClose={() => {
                        setDeleteOpen(false);
                        setDeleting(null);
                    }}
                />
            ) : null}

            {can('checklists.view') ? (
                <ChecklistPdfPreviewModal
                    open={pdfOpen}
                    checklist={pdfChecklist}
                    onClose={() => {
                        setPdfOpen(false);
                        setPdfChecklist(null);
                    }}
                />
            ) : null}
        </div>
    );
}
