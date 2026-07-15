import { useForm } from '@inertiajs/react';
import { useEffect, type FormEvent } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type Props = {
    open: boolean;
    onClose: () => void;
};

function todayInput(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function AlcoholPackageFormModal({ open, onClose }: Props) {
    const form = useForm({
        title: '',
        session_date: todayInput(),
        notes: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            title: '',
            session_date: todayInput(),
            notes: '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        form.clearErrors();

        let hasLocalError = false;

        if (!form.data.title.trim()) {
            form.setError('title', 'Indica un título para el paquete.');
            hasLocalError = true;
        }

        if (!form.data.session_date) {
            form.setError('session_date', 'Indica la fecha del operativo.');
            hasLocalError = true;
        }

        if (hasLocalError) {
            return;
        }

        form.post('/alcoholimetro', {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={() => {
                if (!form.processing) {
                    onClose();
                }
            }}
            title="Nuevo paquete de alcohómetro"
            description="Define el operativo (título y fecha). Luego registrarás los tests dentro."
            className="sm:max-w-lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={form.processing}
                        onClick={onClose}
                        className="cursor-pointer border-[#c5d5e6]"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="alcohol-package-form"
                        disabled={form.processing}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        {form.processing ? <Spinner /> : null}
                        Crear paquete
                    </Button>
                </>
            }
        >
            <form
                id="alcohol-package-form"
                onSubmit={handleSubmit}
                className="grid gap-3"
            >
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Título <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                        className="h-9 border-[#c5d5e6]"
                        placeholder="Ej. Test inopinada por fecha de fiestas"
                    />
                    <InputError message={form.errors.title} />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Fecha del operativo{' '}
                        <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        type="date"
                        value={form.data.session_date}
                        onChange={(e) =>
                            form.setData('session_date', e.target.value)
                        }
                        className="h-9 border-[#c5d5e6]"
                    />
                    <InputError message={form.errors.session_date} />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">Notas</Label>
                    <Textarea
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        rows={3}
                        className="border-[#c5d5e6]"
                        placeholder="Contexto del operativo (opcional)"
                    />
                    <InputError message={form.errors.notes} />
                </div>
            </form>
        </AppModal>
    );
}
