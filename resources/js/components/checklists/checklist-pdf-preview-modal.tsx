import { Download, ExternalLink, FileText, Send } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useState } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import type { ChecklistItemRow } from '@/components/checklists/checklists-table';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCan } from '@/hooks/use-can';

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
    const { can } = useCan();
    const [sending, setSending] = useState(false);

    if (!checklist) {
        return null;
    }

    const previewSrc = pdfUrl(checklist.id);
    const downloadSrc = pdfUrl(checklist.id, true);
    const type = (checklist.template?.type ?? '').toUpperCase();
    const canSend =
        can('checklists.update') &&
        checklist.first_result === 'approved' &&
        checklist.coordinator_status !== 'reviewed' &&
        !checklist.sealed_at;
    const alreadyObserved = checklist.coordinator_status === 'observed';
    const alreadyReviewed = checklist.coordinator_status === 'reviewed';

    const sendToCoordinator = () => {
        if (!canSend || sending) {
            return;
        }

        setSending(true);
        router.post(`/inspecciones/${checklist.id}/enviar-coordinador`, {}, {
            preserveScroll: true,
            onFinish: () => setSending(false),
            onSuccess: () => onClose(),
        });
    };

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
                    {canSend ? (
                        <Button
                            type="button"
                            disabled={sending}
                            onClick={sendToCoordinator}
                            className="cursor-pointer bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                            {sending ? <Spinner /> : <Send className="size-4" />}
                            {alreadyObserved
                                ? 'Reenviar a coordinador'
                                : 'Enviar a coordinador'}
                        </Button>
                    ) : null}
                </>
            }
        >
            <div className="flex min-h-[70vh] flex-col bg-[#eef2f7]">
                <div className="flex flex-wrap items-center gap-2 border-b border-[#e2eaf3] bg-white px-4 py-2 text-xs text-[#5a7390]">
                    <FileText className="size-3.5 text-[#2e5a9e]" />
                    Vista previa del consolidado.
                    {alreadyReviewed ? (
                        <span className="rounded-full bg-violet-50 px-2 py-0.5 font-medium text-violet-800">
                            Revisado
                        </span>
                    ) : alreadyObserved ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                            Observado — pendiente respuesta del coordinador
                        </span>
                    ) : (
                        <span>
                            Puedes enviarlo al coordinador para plan de acción.
                        </span>
                    )}
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
