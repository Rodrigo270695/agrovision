import { useForm } from '@inertiajs/react';
import { Camera, ImagePlus } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import InputError from '@/components/input-error';
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
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type DriverBlacklistDraft = {
    driver_name: string;
    driver_dni?: string | null;
    plate_number?: string | null;
    source?: 'checklist' | 'alcohol_test' | 'induction' | 'manual';
    unit_id?: number | null;
    unit_checklist_id?: number | null;
    alcohol_test_id?: number | null;
    induction_attendee_id?: number | null;
};

const REASON_OPTIONS = [
    { value: 'estado_etilico', label: 'Ingreso con estado etílico' },
    { value: 'suplantacion_identidad', label: 'Suplantación de identidad' },
    { value: 'otro', label: 'Otro motivo' },
] as const;

const inputClass =
    'h-9 border-brand-300 bg-white text-sm focus-visible:border-brand-500 focus-visible:ring-brand-400/35';

async function fileToCompressedDataUrl(file: File): Promise<string> {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        bitmap.close();
        throw new Error('No se pudo procesar la imagen.');
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    return canvas.toDataURL('image/jpeg', 0.82);
}

type Props = {
    open: boolean;
    draft: DriverBlacklistDraft | null;
    onClose: () => void;
};

export function DriverBlacklistModal({ open, draft, onClose }: Props) {
    const form = useForm({
        driver_name: '',
        driver_dni: '',
        plate_number: '',
        reason_code: 'estado_etilico',
        reason_detail: '',
        evidence_photo_data_url: '',
        source: 'manual' as DriverBlacklistDraft['source'],
        unit_id: null as number | null,
        unit_checklist_id: null as number | null,
        alcohol_test_id: null as number | null,
        induction_attendee_id: null as number | null,
    });
    const [compressing, setCompressing] = useState(false);

    useEffect(() => {
        if (!open || !draft) {
            return;
        }

        form.setData({
            driver_name: draft.driver_name ?? '',
            driver_dni: draft.driver_dni ?? '',
            plate_number: draft.plate_number ?? '',
            reason_code: 'estado_etilico',
            reason_detail: '',
            evidence_photo_data_url: '',
            source: draft.source ?? 'manual',
            unit_id: draft.unit_id ?? null,
            unit_checklist_id: draft.unit_checklist_id ?? null,
            alcohol_test_id: draft.alcohol_test_id ?? null,
            induction_attendee_id: draft.induction_attendee_id ?? null,
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, draft?.driver_name, draft?.driver_dni, draft?.plate_number]);

    const handleClose = () => {
        form.reset();
        form.clearErrors();
        onClose();
    };

    const onPickPhoto = async (file: File | null) => {
        if (!file) {
            return;
        }

        setCompressing(true);

        try {
            const dataUrl = await fileToCompressedDataUrl(file);
            form.clearErrors('evidence_photo_data_url');
            form.setData('evidence_photo_data_url', dataUrl);
        } catch {
            form.setError(
                'evidence_photo_data_url',
                'No se pudo procesar la foto.',
            );
        } finally {
            setCompressing(false);
        }
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (
            form.data.driver_name.trim() === '' ||
            !form.data.evidence_photo_data_url ||
            form.processing
        ) {
            if (!form.data.evidence_photo_data_url) {
                form.setError(
                    'evidence_photo_data_url',
                    'Sube una foto como evidencia.',
                );
            }

            return;
        }

        form.post('/lista-negra-conductores', {
            preserveScroll: true,
            onSuccess: () => handleClose(),
        });
    };

    return (
        <AppModal
            open={open && Boolean(draft)}
            onClose={handleClose}
            title="Lista negra de conductores"
            description="Registra el motivo y una foto de evidencia. Quedará visible para inspección, alcohómetro e inducción."
            className="sm:max-w-lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        className="cursor-pointer border-brand-300 text-brand-700"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="driver-blacklist-form"
                        disabled={form.processing || compressing}
                        className="cursor-pointer bg-red-700 text-white hover:bg-red-800 disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        Enviar a lista negra
                    </Button>
                </>
            }
        >
            <form
                id="driver-blacklist-form"
                onSubmit={handleSubmit}
                className="space-y-4"
            >
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1.5 sm:col-span-2">
                        <Label className="text-xs text-brand-700">
                            Conductor <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={form.data.driver_name}
                            onChange={(e) =>
                                form.setData('driver_name', e.target.value)
                            }
                            className={inputClass}
                        />
                        <InputError message={form.errors.driver_name} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-brand-700">DNI</Label>
                        <Input
                            value={form.data.driver_dni}
                            onChange={(e) =>
                                form.setData('driver_dni', e.target.value)
                            }
                            className={inputClass}
                        />
                        <InputError message={form.errors.driver_dni} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-brand-700">Placa</Label>
                        <Input
                            value={form.data.plate_number}
                            onChange={(e) =>
                                form.setData('plate_number', e.target.value)
                            }
                            className={inputClass}
                        />
                        <InputError message={form.errors.plate_number} />
                    </div>
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-brand-700">
                        Motivo <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        modal={false}
                        value={form.data.reason_code}
                        onValueChange={(value) =>
                            form.setData('reason_code', value)
                        }
                    >
                        <SelectTrigger
                            className={cn(inputClass, 'w-full cursor-pointer')}
                        >
                            <SelectValue placeholder="Selecciona" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                            {REASON_OPTIONS.map((option) => (
                                <SelectItem
                                    key={option.value}
                                    value={option.value}
                                    className="cursor-pointer"
                                >
                                    {option.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <InputError message={form.errors.reason_code} />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-brand-700">
                        Detalle
                        {form.data.reason_code === 'otro' ? (
                            <span className="text-red-500"> *</span>
                        ) : null}
                    </Label>
                    <Textarea
                        value={form.data.reason_detail}
                        onChange={(e) =>
                            form.setData('reason_detail', e.target.value)
                        }
                        placeholder="Ej. Intentó ingresar con documento ajeno / positivo en control"
                        className="min-h-20 border-brand-300 bg-white text-sm"
                    />
                    <InputError message={form.errors.reason_detail} />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-brand-700">
                        Foto evidencia <span className="text-red-500">*</span>
                    </Label>
                    {form.data.evidence_photo_data_url ? (
                        <div className="relative overflow-hidden rounded-xl border border-brand-200">
                            <img
                                src={form.data.evidence_photo_data_url}
                                alt="Evidencia"
                                className="max-h-56 w-full object-contain bg-[#f7fafc]"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    form.setData('evidence_photo_data_url', '')
                                }
                                className="absolute top-2 right-2 cursor-pointer bg-white/95"
                            >
                                Quitar
                            </Button>
                        </div>
                    ) : (
                        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-brand-300 bg-[#f7fafc] px-4 py-8 text-center hover:bg-brand-50">
                            {compressing ? (
                                <Spinner />
                            ) : (
                                <>
                                    <span className="inline-flex size-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                                        <Camera className="size-5" />
                                    </span>
                                    <span className="text-sm font-medium text-brand-800">
                                        Tomar o subir foto
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                        <ImagePlus className="size-3.5" />
                                        JPG o PNG
                                    </span>
                                </>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                disabled={compressing}
                                onChange={(event) => {
                                    void onPickPhoto(
                                        event.target.files?.[0] ?? null,
                                    );
                                    event.target.value = '';
                                }}
                            />
                        </label>
                    )}
                    <InputError message={form.errors.evidence_photo_data_url} />
                </div>
            </form>
        </AppModal>
    );
}
