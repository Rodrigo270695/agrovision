import { Download, ExternalLink, FileText } from 'lucide-react';
import { AppModal } from '@/components/shared/app-modal';
import type { ChecklistItemRow } from '@/components/checklists/checklists-table';
import { Button } from '@/components/ui/button';

type Props = {
    open: boolean;
    checklist: ChecklistItemRow | null;
    onClose: () => void;
};

function pdfUrl(id: number, download = false): string {
    const base = `/inspecciones/${id}/pdf`;

    return download ? `${base}?download=1` : base;
}

export function ChecklistPdfPreviewModal({ open, checklist, onClose }: Props) {
    if (!checklist) {
        return null;
    }

    const previewSrc = pdfUrl(checklist.id);
    const downloadSrc = pdfUrl(checklist.id, true);
    const type = (checklist.template?.type ?? '').toUpperCase();

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title="Consolidado PDF"
            description={`${type || 'Inspección'} · ${checklist.plate_number}${
                checklist.driver_name ? ` · ${checklist.driver_name}` : ''
            }`}
            className="sm:max-w-5xl"
            bodyClassName="p-0"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                    >
                        <a
                            href={previewSrc}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <ExternalLink className="size-4" />
                            Abrir en otra pestaña
                        </a>
                    </Button>
                    <Button
                        type="button"
                        asChild
                        className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
                    >
                        <a href={downloadSrc} download>
                            <Download className="size-4" />
                            Descargar PDF
                        </a>
                    </Button>
                </>
            }
        >
            <div className="flex min-h-[70vh] flex-col bg-[#eef2f7]">
                <div className="flex items-center gap-2 border-b border-[#e2eaf3] bg-white px-4 py-2 text-xs text-[#5a7390]">
                    <FileText className="size-3.5 text-[#2e5a9e]" />
                    Vista previa del consolidado. Revisa el documento y, si
                    quieres, descárgalo o ábrelo en otra pestaña.
                </div>
                <iframe
                    key={previewSrc}
                    title={`PDF ${checklist.plate_number}`}
                    src={previewSrc}
                    className="h-[70vh] w-full flex-1 border-0 bg-white"
                />
            </div>
        </AppModal>
    );
}
