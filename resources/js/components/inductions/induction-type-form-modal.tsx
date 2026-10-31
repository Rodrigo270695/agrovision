import { useForm } from '@inertiajs/react';
import { useEffect, type FormEvent } from 'react';
import InputError from '@/components/input-error';
import type { FormOption } from '@/components/inductions/induction-form-fields';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    activityOptions: FormOption[];
    onClose: () => void;
};

const inputClass =
    'h-9 border-[#c5d5e6] bg-white text-sm focus-visible:border-[#2e5a9e] focus-visible:ring-[#4a90e2]/35';

export function InductionTypeFormModal({
    open,
    activityOptions,
    onClose,
}: Props) {
    const form = useForm({
        title: '',
        activity: 'capacitacion',
        short: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            title: '',
            activity: 'capacitacion',
            short: '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const handleClose = () => {
        form.reset();
        form.clearErrors();
        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (form.data.title.trim() === '' || form.processing) {
            return;
        }

        form.post('/inducciones/tipos', {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title="Nuevo tipo"
            description="Crea una inducción o capacitación con otro nombre. Luego abres paquetes y creas sesiones por fecha."
            className="sm:max-w-lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="induction-type-form"
                        disabled={form.data.title.trim() === '' || form.processing}
                        className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c] disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        Crear tipo
                    </Button>
                </>
            }
        >
            <form id="induction-type-form" onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Nombre <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        value={form.data.title}
                        onChange={(e) => form.setData('title', e.target.value)}
                        placeholder="Ej. Capacitación: Primeros auxilios"
                        className={inputClass}
                        autoFocus
                    />
                    <InputError message={form.errors.title} />
                </div>
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Actividad <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        modal={false}
                        value={form.data.activity}
                        onValueChange={(value) => form.setData('activity', value)}
                    >
                        <SelectTrigger className={cn(inputClass, 'w-full cursor-pointer')}>
                            <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            {activityOptions.map((opt) => (
                                <SelectItem
                                    key={opt.value}
                                    value={opt.value}
                                    className="cursor-pointer"
                                >
                                    {opt.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.activity} />
                </div>
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">Nombre corto</Label>
                    <Input
                        value={form.data.short}
                        onChange={(e) => form.setData('short', e.target.value)}
                        placeholder="Opcional · se usa en breadcrumbs"
                        className={inputClass}
                    />
                    <InputError message={form.errors.short} />
                </div>
            </form>
        </AppModal>
    );
}
