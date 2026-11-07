import { router } from '@inertiajs/react';
import { ArrowRightLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { ChecklistItemRow } from '@/components/checklists/checklists-table';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type InspectorOption = {
    id: number;
    name: string;
};

type Props = {
    open: boolean;
    checklist: ChecklistItemRow | null;
    inspectors: InspectorOption[];
    onClose: () => void;
};

export function ChecklistTransferModal({
    open,
    checklist,
    inspectors,
    onClose,
}: Props) {
    const [toUserId, setToUserId] = useState<string>('');
    const [note, setNote] = useState('');
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const options = useMemo(() => {
        const currentId = checklist?.created_by ?? null;

        return inspectors.filter((inspector) => inspector.id !== currentId);
    }, [checklist?.created_by, inspectors]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setToUserId(options[0] ? String(options[0].id) : '');
        setNote('');
        setError(null);
        setProcessing(false);
    }, [open, checklist?.id, options]);

    const handleSubmit = () => {
        if (!checklist || typeof checklist.id !== 'number' || processing) {
            return;
        }

        if (!toUserId) {
            setError('Selecciona el inspector destino.');
            return;
        }

        setProcessing(true);
        setError(null);

        router.post(
            `/inspecciones/${checklist.id}/traspasar`,
            {
                to_user_id: Number(toUserId),
                note: note.trim() || null,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => onClose(),
                onError: (errors) => {
                    setError(
                        errors.to_user_id ||
                            errors.note ||
                            Object.values(errors)[0] ||
                            'No se pudo traspasar la inspección.',
                    );
                },
            },
        );
    };

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title="Traspasar inspección"
            description={
                checklist
                    ? `${checklist.plate_number} · ${checklist.creator?.name || 'Sin inspector'}`
                    : undefined
            }
            footer={
                <div className="flex flex-wrap justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        disabled={processing}
                        onClick={onClose}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        className="cursor-pointer bg-brand-500 text-white hover:bg-brand-600"
                        disabled={processing || options.length === 0}
                        onClick={handleSubmit}
                    >
                        <ArrowRightLeft className="size-4" />
                        {processing ? 'Traspasando…' : 'Traspasar'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                <p className="text-sm text-slate-600">
                    La inspección pasará a otro inspector. Quedará registrado
                    quién la tenía, a quién se asigna y quién hizo el traspaso.
                </p>

                <div className="grid gap-1.5">
                    <Label htmlFor="transfer-inspector">Inspector destino</Label>
                    <select
                        id="transfer-inspector"
                        value={toUserId}
                        onChange={(event) => setToUserId(event.target.value)}
                        disabled={processing || options.length === 0}
                        className="h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                    >
                        {options.length === 0 ? (
                            <option value="">No hay otros inspectores</option>
                        ) : (
                            options.map((inspector) => (
                                <option key={inspector.id} value={inspector.id}>
                                    {inspector.name}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="transfer-note">Nota (opcional)</Label>
                    <Textarea
                        id="transfer-note"
                        rows={3}
                        value={note}
                        disabled={processing}
                        placeholder="Motivo del traspaso…"
                        onChange={(event) => setNote(event.target.value)}
                        className="border-slate-200"
                    />
                </div>

                {error ? (
                    <p className="text-xs text-rose-600" role="alert">
                        {error}
                    </p>
                ) : null}
            </div>
        </AppModal>
    );
}
