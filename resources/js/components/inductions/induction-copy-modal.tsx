import { useForm } from '@inertiajs/react';
import { useEffect, type FormEvent } from 'react';
import { FormModal } from '@/components/forms/form-modal';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type CopySource = {
    id: number | string;
    title: string;
    temario?: string | null;
};

type Props = {
    open: boolean;
    induction: CopySource | null;
    onClose: () => void;
};

const inputClassName =
    'border-[#c5d5e6] bg-white focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35';

export function InductionCopyModal({ open, induction, onClose }: Props) {
    const form = useForm({
        title: '',
        temario: '',
    });

    useEffect(() => {
        if (!open || !induction) {
            return;
        }

        form.setData({
            title: induction.title,
            temario: induction.temario ?? '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, induction?.id]);

    const handleClose = () => {
        form.reset();
        form.clearErrors();
        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!induction || form.processing || form.data.title.trim() === '') {
            return;
        }

        form.post(`/inducciones/${induction.id}/copiar`, {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    return (
        <FormModal
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    handleClose();
                }
            }}
            title="Copiar inducción"
            description="Se copian los conductores con su firma y su huella. Los reglamentos quedan vacíos."
            size="md"
            onSubmit={handleSubmit}
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={form.processing || form.data.title.trim() === ''}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        Copiar
                    </Button>
                </>
            }
        >
            <div className="grid gap-4">
                <div className="grid gap-1.5">
                    <Label htmlFor="copy-title">Nombre</Label>
                    <Input
                        id="copy-title"
                        value={form.data.title}
                        onChange={(event) => form.setData('title', event.target.value)}
                        className={`h-11 ${inputClassName}`}
                    />
                    <InputError message={form.errors.title} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor="copy-temario">Temario</Label>
                    <Textarea
                        id="copy-temario"
                        value={form.data.temario}
                        onChange={(event) => form.setData('temario', event.target.value)}
                        rows={5}
                        className={inputClassName}
                    />
                    <InputError message={form.errors.temario} />
                </div>
            </div>
        </FormModal>
    );
}
