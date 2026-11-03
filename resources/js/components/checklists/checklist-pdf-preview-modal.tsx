import { Download, ExternalLink, FileText } from 'lucide-react';
import { AppModal } from '@/components/shared/app-modal';
import type { ChecklistItemRow } from '@/components/checklists/checklists-table';
import { Button } from '@/components/ui/button';

type Props = {
    open: boolean;
    checklist: ChecklistItemRow | null;
    onClose: () => void;
};

function pdfUrl(id: number | string, download = false): string {
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
                        className="cursor-pointer border-brand-300 text-brand-700"
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="cursor-pointer border-brand-300 text-brand-700"
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
                        className="cursor-pointer bg-brand-500 text-white hover:bg-brand-700"
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
                <div className="flex flex-wrap items-center gap-2 border-b border-brand-200 bg-white px-4 py-2 text-xs text-muted-foreground">
                    <FileText className="size-3.5 text-brand-500" />
                    Vista previa. El coordinador recibe el paquete de esta
                    fecha, no esta inspección sola.
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
