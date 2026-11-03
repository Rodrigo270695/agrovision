import { useEffect, useState } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';

type Person = { id: number; name: string };

type Props = {
    open: boolean;
    onClose: () => void;
    templateId: number;
    attendees: Person[];
    attendeeId?: number | null;
};

export function CertificatePreviewModal({
    open,
    onClose,
    templateId,
    attendees,
    attendeeId = null,
}: Props) {
    const [personId, setPersonId] = useState<number | null>(attendeeId);

    const fallbackId = attendees[0]?.id ?? null;

    useEffect(() => {
        if (open) {
            setPersonId(attendeeId ?? fallbackId);
        }
    }, [open, attendeeId, fallbackId]);

    const src = personId
        ? `/certificados/plantillas/${templateId}/previsualizar?attendee=${personId}`
        : `/certificados/plantillas/${templateId}/previsualizar`;

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title="Vista previa del certificado"
            description="Es el PDF que se adjunta al correo. Si todavía no se emitió, el código dice VISTA-PREVIA; al enviar se reemplaza por el código real."
            className="sm:max-w-5xl"
            bodyClassName="max-h-[80vh]"
            footer={
                <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer border-brand-300 text-brand-700">
                    Cerrar
                </Button>
            }
        >
            <div className="space-y-3">
                {attendees.length > 1 ? (
                    <label className="grid gap-1 text-xs text-brand-700">
                        Conductor
                        <select
                            value={personId ?? ''}
                            onChange={(event) => setPersonId(Number(event.target.value))}
                            className="h-9 rounded-lg border border-brand-300 bg-white px-2 text-sm"
                        >
                            {attendees.map((person) => (
                                <option key={person.id} value={person.id}>
                                    {person.name}
                                </option>
                            ))}
                        </select>
                    </label>
                ) : null}
                {open ? (
                    <iframe
                        key={src}
                        src={src}
                        title="Vista previa del certificado"
                        className="h-[68vh] w-full rounded-lg border border-brand-200 bg-white"
                    />
                ) : null}
            </div>
        </AppModal>
    );
}
