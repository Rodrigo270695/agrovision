import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

type Group = {
    coordinator_id: number;
    coordinator_name: string;
    ready: number;
};

type Preview = {
    date: string;
    groups: Group[];
    pending: number;
    without_coordinator: number;
    already_signed: number;
    total: number;
};

type Props = {
    open: boolean;
    onClose: () => void;
};

function todayInput(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

    return local.toISOString().slice(0, 10);
}

export function SendInspectionBatchModal({ open, onClose }: Props) {
    const [date, setDate] = useState(todayInput);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        setDate(todayInput());
    }, [open]);

    useEffect(() => {
        if (!open || date === '') {
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        setError(null);

        void fetch(`/inspecciones/paquetes/vista?date=${date}`, {
            credentials: 'same-origin',
            signal: controller.signal,
            headers: {
                Accept: 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
            },
        })
            .then(async (response) => {
                const payload = (await response.json().catch(() => null)) as
                    | Preview
                    | { message?: string }
                    | null;

                if (!response.ok || !payload || !('groups' in payload)) {
                    throw new Error(
                        (payload as { message?: string } | null)?.message ||
                            'No se pudo revisar esa fecha.',
                    );
                }

                setPreview(payload);
            })
            .catch((reason: unknown) => {
                if (reason instanceof DOMException && reason.name === 'AbortError') {
                    return;
                }

                setPreview(null);
                setError(
                    reason instanceof Error
                        ? reason.message
                        : 'No se pudo revisar esa fecha.',
                );
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [open, date]);

    const readyTotal =
        preview?.groups.reduce((sum, group) => sum + group.ready, 0) ?? 0;

    const send = () => {
        if (readyTotal === 0 || sending) {
            return;
        }

        setSending(true);
        router.post(
            '/inspecciones/paquetes',
            { date },
            {
                onFinish: () => setSending(false),
                onSuccess: () => onClose(),
            },
        );
    };

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title="Enviar paquete del día"
            description="Se envía con la 1ra cerrada. La 2da sigue por su cuenta, con sus propias firmas."
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="cursor-pointer border-[#c5d5e6]"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        disabled={readyTotal === 0 || sending || loading}
                        onClick={send}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        {sending ? <Spinner /> : null}
                        Enviar paquete
                    </Button>
                </>
            }
        >
            <div className="grid gap-3">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Fecha de la 1ra inspección
                    </Label>
                    <Input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        className="h-9 border-[#c5d5e6]"
                    />
                </div>

                {loading ? (
                    <p className="text-xs text-[#5a7390]">Revisando el día…</p>
                ) : null}
                {error ? <p className="text-xs text-red-600">{error}</p> : null}

                {preview && !loading ? (
                    <div className="space-y-2 text-xs text-[#1a2b4c]">
                        {preview.groups.length === 0 ? (
                            <p className="rounded-lg bg-[#f8fafc] px-3 py-2 text-[#5a7390]">
                                No hay inspecciones con la 1ra cerrada para
                                enviar.
                            </p>
                        ) : (
                            preview.groups.map((group) => (
                                <div
                                    key={group.coordinator_id}
                                    className="flex items-center justify-between rounded-lg border border-[#d7e3f0] bg-[#f8fafc] px-3 py-2"
                                >
                                    <span className="font-medium">
                                        {group.coordinator_name}
                                    </span>
                                    <span>{group.ready} inspecciones</span>
                                </div>
                            ))
                        )}
                        {preview.pending > 0 ? (
                            <p className="text-[#8a5a12]">
                                {preview.pending} aún no cierran la 1ra
                                inspección y no entran al envío.
                            </p>
                        ) : null}
                        {preview.without_coordinator > 0 ? (
                            <p className="text-[#8a5a12]">
                                {preview.without_coordinator} sin coordinador
                                asignado.
                            </p>
                        ) : null}
                        {preview.already_signed > 0 ? (
                            <p className="text-[#5a7390]">
                                {preview.already_signed} ya están en un paquete
                                firmado.
                            </p>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </AppModal>
    );
}
