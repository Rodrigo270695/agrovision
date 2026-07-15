import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { ChecklistCreateModal } from '@/components/checklists/checklist-create-modal';
import type {
    ActiveUnitOption,
    ChecklistTemplateOption,
} from '@/components/checklists/checklist-create-modal';
import { ChecklistDeleteModal } from '@/components/checklists/checklist-delete-modal';
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

type PageProps = {
    checklists: ChecklistsPagination;
    stats: ChecklistsStatsData;
    filters: ChecklistsFilters;
    templates: ChecklistTemplateOption[];
    activeUnits: ActiveUnitOption[];
};

export function ChecklistsPage() {
    const { checklists, stats, filters, templates, activeUnits } = usePage()
        .props as unknown as PageProps;
    const { can } = useCan();

    const [createOpen, setCreateOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<ChecklistItemRow | null>(null);
    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfChecklist, setPdfChecklist] = useState<ChecklistItemRow | null>(
        null,
    );

    return (
        <div className="flex h-full flex-1 flex-col gap-4 p-4">
            <ChecklistsHeader
                stats={stats}
                onCreate={() => {
                    if (can('checklists.create')) {
                        setCreateOpen(true);
                    }
                }}
            />

            <ChecklistsTable
                checklists={checklists}
                filters={filters}
                onEdit={(item) => {
                    if (can('checklists.update') || item.sealed_at) {
                        router.visit(`/inspecciones/${item.id}/editar`);
                    }
                }}
                onPreviewPdf={(item) => {
                    if (!can('checklists.view')) {
                        return;
                    }

                    setPdfChecklist(item);
                    setPdfOpen(true);
                }}
                onDelete={(item) => {
                    if (!can('checklists.delete')) {
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
                    onClose={() => setCreateOpen(false)}
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
