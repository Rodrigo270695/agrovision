import { router } from '@inertiajs/react';
import { FileText, Mail, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { CertificatePreviewModal } from '@/components/certificates/certificate-preview-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCan } from '@/hooks/use-can';

type Regulation = { id: number; name: string; url: string | null };
type Template = { id: number; name: string };

type Person = { id: number; name: string };

type Props = {
    inductionId: number;
    status: string;
    regulations: Regulation[];
    templates: Template[];
    attendees: Person[];
};

export function InductionMailPanels({
    inductionId,
    status,
    regulations,
    templates,
    attendees,
}: Props) {
    const { can } = useCan();
    const canUpdate = can('inductions.update');
    const canIssue = can('certificates.create');
    const canPreview = can('certificates.view') || canIssue;
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [sendingRegulations, setSendingRegulations] = useState(false);
    const [sendingTemplate, setSendingTemplate] = useState<number | null>(null);
    const [previewTemplateId, setPreviewTemplateId] = useState<number | null>(null);
    const cancelled = status === 'cancelled';

    const upload = (files: FileList | null) => {
        if (!files || files.length === 0 || uploading) {
            return;
        }

        const data = new FormData();
        Array.from(files).forEach((file) => data.append('regulations[]', file));
        setUploading(true);
        router.post(`/inducciones/${inductionId}/reglamentos`, data, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                setUploading(false);
                if (inputRef.current) {
                    inputRef.current.value = '';
                }
            },
        });
    };

    return (
        <div className="grid shrink-0 gap-4 xl:grid-cols-2">
            <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                        <h2 className="text-sm font-semibold text-[#1a2b4c]">Reglamentos</h2>
                        <p className="mt-0.5 text-xs text-[#6b8ead]">
                            PDF de esta inducción. Al jalar conductores se envían al correo del coordinador de cada uno.
                        </p>
                    </div>
                    {canUpdate && !cancelled ? (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={uploading}
                                onClick={() => inputRef.current?.click()}
                                className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                            >
                                {uploading ? <Spinner /> : <FileText className="size-4" />}
                                Subir PDF
                            </Button>
                            <Button
                                type="button"
                                disabled={sendingRegulations || regulations.length === 0}
                                onClick={() => {
                                    setSendingRegulations(true);
                                    router.post(`/inducciones/${inductionId}/reglamentos/enviar`, {}, {
                                        preserveScroll: true,
                                        onFinish: () => setSendingRegulations(false),
                                    });
                                }}
                                className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
                            >
                                {sendingRegulations ? <Spinner /> : <Mail className="size-4" />}
                                Enviar a coordinadores
                            </Button>
                        </div>
                    ) : null}
                </div>
                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    className="hidden"
                    onChange={(event) => upload(event.target.files)}
                />
                {regulations.length === 0 ? (
                    <p className="text-sm text-[#6b8ead]">Todavía no hay reglamentos.</p>
                ) : (
                    <ul className="space-y-2">
                        {regulations.map((file) => (
                            <li key={file.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#e2eaf3] px-3 py-2">
                                {file.url ? (
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="truncate text-sm text-[#2e5a9e] hover:underline">
                                        {file.name}
                                    </a>
                                ) : (
                                    <span className="truncate text-sm text-[#1a2b4c]">{file.name}</span>
                                )}
                                {canUpdate && !cancelled ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            router.delete(`/inducciones/${inductionId}/reglamentos/${file.id}`, {
                                                preserveScroll: true,
                                            });
                                        }}
                                        className="cursor-pointer text-[#9a3412]"
                                        title="Quitar reglamento"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-[#1a2b4c]">Certificados por correo</h2>
                <p className="mt-0.5 text-xs text-[#6b8ead]">
                    Cuando la inducción termina y los conductores asistieron y firmaron, la plantilla toma esos datos y envía el PDF al correo de cada unidad.
                </p>
                {templates.length === 0 ? (
                    <p className="mt-3 text-sm text-[#6b8ead]">
                        No hay plantilla para esta inducción.{' '}
                        <a href="/certificados/plantillas/nueva" className="font-medium text-[#2e5a9e] hover:underline">
                            Crear plantilla
                        </a>
                    </p>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {templates.map((template) => (
                            <li key={template.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#e2eaf3] px-3 py-2">
                                <a href={`/certificados/plantillas/${template.id}`} className="text-sm font-medium text-[#1a2b4c] hover:underline">
                                    {template.name}
                                </a>
                                {canPreview || canIssue ? (
                                    <div className="flex flex-wrap gap-2">
                                        {canPreview ? (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => setPreviewTemplateId(template.id)}
                                                className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                            >
                                                Previsualizar
                                            </Button>
                                        ) : null}
                                        {canIssue ? (
                                            <Button
                                                type="button"
                                                disabled={sendingTemplate === template.id}
                                                onClick={() => {
                                                    setSendingTemplate(template.id);
                                                    router.post(`/certificados/plantillas/${template.id}/enviar`, {}, {
                                                        preserveScroll: true,
                                                        onFinish: () => setSendingTemplate(null),
                                                    });
                                                }}
                                                className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                                            >
                                                {sendingTemplate === template.id ? <Spinner /> : <Mail className="size-4" />}
                                                Enviar a conductores
                                            </Button>
                                        ) : null}
                                    </div>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            {previewTemplateId ? (
                <CertificatePreviewModal
                    open
                    onClose={() => setPreviewTemplateId(null)}
                    templateId={previewTemplateId}
                    attendees={attendees}
                />
            ) : null}
        </div>
    );
}
