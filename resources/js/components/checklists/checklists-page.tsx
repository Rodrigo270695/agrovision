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
import { SendInspectionBatchModal } from '@/components/checklists/send-inspection-batch-modal';
import type { ChecklistsStatsData } from '@/components/checklists/checklists-stats';
import {
    ChecklistsTable,
    type ChecklistItemRow,
    type ChecklistsFilters,
    type ChecklistsPagination,
} from '@/components/checklists/checklists-table';
import { useCan } from '@/hooks/use-can';
import { isBrowserOnline, isLocalChecklistId } from '@/lib/offline/ids';
import { MUTATIONS_EVENT } from '@/lib/offline/mutations';
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

function inspectionExportHref(filters: ChecklistsFilters): string {
    const params = new URLSearchParams();

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.template_type) {
        params.set('template_type', filters.template_type);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    const query = params.toString();

    return query ? `/inspecciones/exportar?${query}` : '/inspecciones/exportar';
}

function prefetchInspectionEdits(
    rows: ChecklistItemRow[],
    version: string | null | undefined,
): void {
    if (!isBrowserOnline()) {
        return;
    }

    void (async () => {
        for (const row of rows) {
            if (typeof row.id !== 'number' || !navigator.onLine) {
                continue;
            }

            try {
                const response = await fetch(`/inspecciones/${row.id}/editar`, {
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'text/html, application/xhtml+xml',
                        'X-Inertia': 'true',
                        'X-Inertia-Version': version ?? '',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (!response.ok) {
                    continue;
                }

                const type = response.headers.get('content-type') ?? '';

                if (!type.includes('json')) {
                    continue;
                }

                const payload = (await response.json()) as {
                    props?: { checklist?: ChecklistFormData };
                };

                if (payload.props?.checklist) {
                    await saveEditSnapshot(payload.props.checklist);
                }
            } catch {
                // La siguiente fila sigue disponible para el caché.
            }
        }
    })();
}

export function ChecklistsPage() {
    const page = usePage();
    const { checklists, stats, filters, templates, activeUnits, offlineCatalog } =
        page.props as unknown as PageProps;
    const { can } = useCan();

    const [createOpen, setCreateOpen] = useState(false);
    const [batchOpen, setBatchOpen] = useState(false);
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

        const load = () => {
            void listLocalDrafts().then((drafts) => {
                if (!cancelled) {
                    setLocalRows(drafts.map(draftToRow));
                }
            });
        };

        load();
        window.addEventListener(MUTATIONS_EVENT, load);

        return () => {
            cancelled = true;
            window.removeEventListener(MUTATIONS_EVENT, load);
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

    const openEditor = async (
        item: ChecklistItemRow,
        pass?: 'first' | 'second',
    ) => {
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

        const query = pass ? `?pass=${pass}` : '';
        router.visit(`/inspecciones/${item.id}/editar${query}`);
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
                exportHref={inspectionExportHref(filters)}
                onCreate={() => {
                    if (can('checklists.create')) {
                        setCreateOpen(true);
                    }
                }}
                onSendBatch={() => setBatchOpen(true)}
            />

            <ChecklistsTable
                checklists={mergedChecklists}
                filters={filters}
                templateOptions={(templates ?? []).map((template) => ({
                    value: template.type,
                    label: template.label || template.type.toUpperCase(),
                }))}
                onEdit={(item, pass) => {
                    if (can('checklists.update') || item.sealed_at) {
                        void openEditor(item, pass);
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

            {can('checklists.update') ? (
                <SendInspectionBatchModal
                    open={batchOpen}
                    onClose={() => setBatchOpen(false)}
                />
            ) : null}

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
