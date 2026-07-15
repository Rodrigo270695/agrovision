import { useForm } from '@inertiajs/react';
import { Camera, ImagePlus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { UnitOption } from '@/components/alcohol-tests/alcohol-tests-table';
import { AppModal } from '@/components/shared/app-modal';
import { SearchableCombobox } from '@/components/shared/searchable-combobox';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type Props = {
    open: boolean;
    packageId: number;
    unitOptions: UnitOption[];
    onClose: () => void;
};

async function fileToCompressedDataUrl(file: File): Promise<string> {
    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
            img.src = objectUrl;
        });

        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('No se pudo preparar la imagen.');
        }

        ctx.drawImage(image, 0, 0, width, height);

        return canvas.toDataURL('image/jpeg', 0.72);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export function AlcoholTestFormModal({
    open,
    packageId,
    unitOptions,
    onClose,
}: Props) {
    const form = useForm({
        unit_id: '' as string,
        driver_name: '',
        driver_dni: '',
        plate_number: '',
        alcohol_level: '0',
        location: '',
        notes: '',
        evidence_photo_data_url: '',
    });

    const fileRef = useRef<HTMLInputElement>(null);
    const [compressing, setCompressing] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            unit_id: '',
            driver_name: '',
            driver_dni: '',
            plate_number: '',
            alcohol_level: '0',
            location: '',
            notes: '',
            evidence_photo_data_url: '',
        });
        form.clearErrors();
        setPhotoError(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, packageId]);

    const plateOptions = useMemo(
        () =>
            unitOptions.map((unit) => ({
                value: String(unit.id),
                label: unit.plate_number || unit.label,
                description: unit.driver_name
                    ? `${unit.driver_name}${unit.driver_dni ? ` · DNI ${unit.driver_dni}` : ''}`
                    : unit.label,
                keywords: [
                    unit.plate_number ?? '',
                    unit.driver_name ?? '',
                    unit.driver_dni ?? '',
                    unit.label,
                ].join(' '),
            })),
        [unitOptions],
    );

    const applyUnit = (unitId: string | null) => {
        form.clearErrors('unit_id');

        if (!unitId) {
            form.setData('unit_id', '');

            return;
        }

        const unit = unitOptions.find((item) => String(item.id) === unitId);

        if (!unit) {
            form.setData('unit_id', unitId);

            return;
        }

        form.setData({
            ...form.data,
            unit_id: unitId,
            driver_name: (
                unit.driver_name ?? form.data.driver_name
            ).toUpperCase(),
            driver_dni: unit.driver_dni ?? form.data.driver_dni,
            plate_number: (
                unit.plate_number ?? form.data.plate_number
            ).toUpperCase(),
        });
    };

    const setPhotoFromFile = async (file: File | null) => {
        if (!file) {
            return;
        }

        setPhotoError(null);
        setCompressing(true);

        try {
            const dataUrl = await fileToCompressedDataUrl(file);
            form.clearErrors('evidence_photo_data_url');
            form.setData('evidence_photo_data_url', dataUrl);
        } catch {
            setPhotoError('No se pudo procesar la foto. Intenta otra imagen.');
        } finally {
            setCompressing(false);
        }
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        form.clearErrors();
        setPhotoError(null);

        let hasLocalError = false;

        if (!form.data.unit_id) {
            form.setError('unit_id', 'Selecciona la unidad.');
            hasLocalError = true;
        }

        if (!form.data.driver_name.trim()) {
            form.setError('driver_name', 'Indica el nombre del conductor.');
            hasLocalError = true;
        }

        if (
            form.data.alcohol_level === '' ||
            !Number.isFinite(Number(form.data.alcohol_level))
        ) {
            form.setError(
                'alcohol_level',
                'Indica el porcentaje de alcohol.',
            );
            hasLocalError = true;
        }

        if (!form.data.evidence_photo_data_url) {
            form.setError(
                'evidence_photo_data_url',
                'La foto de evidencia es obligatoria.',
            );
            setPhotoError('La foto de evidencia es obligatoria.');
            hasLocalError = true;
        }

        if (hasLocalError) {
            return;
        }

        form.transform((data) => ({
            unit_id: Number(data.unit_id),
            driver_name: data.driver_name,
            driver_dni: data.driver_dni || null,
            plate_number: data.plate_number || null,
            alcohol_level: Number(data.alcohol_level),
            location: data.location || null,
            notes: data.notes || null,
            evidence_photo_data_url: data.evidence_photo_data_url,
        }));

        form.post(`/alcoholimetro/${packageId}/tests`, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    const level = Number(form.data.alcohol_level);
    const willAlert = Number.isFinite(level) && level > 0;

    return (
        <AppModal
            open={open}
            onClose={() => {
                if (!form.processing && !compressing) {
                    onClose();
                }
            }}
            title="Registrar test"
            description="Se asocia a este paquete. Al finalizar el operativo, envía el paquete al coordinador con todos los resultados."
            className="sm:max-w-lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        disabled={form.processing || compressing}
                        onClick={onClose}
                        className="cursor-pointer border-[#c5d5e6]"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="alcohol-test-form"
                        disabled={form.processing || compressing}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        {form.processing ? <Spinner /> : null}
                        Guardar test
                    </Button>
                </>
            }
        >
            <form
                id="alcohol-test-form"
                onSubmit={handleSubmit}
                className="grid gap-3"
            >
                <div className="grid gap-1.5">
                    <Label
                        htmlFor="alcohol-test-unit"
                        className="text-xs text-[#1a2b4c]"
                    >
                        Unidad <span className="text-red-500">*</span>
                    </Label>
                    <SearchableCombobox
                        id="alcohol-test-unit"
                        value={form.data.unit_id || null}
                        options={plateOptions}
                        onChange={applyUnit}
                        placeholder="Buscar por placa o conductor..."
                        emptyMessage="Sin coincidencias"
                        disabled={form.processing}
                    />
                    <InputError message={form.errors.unit_id} />
                </div>

                <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Conductor <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={form.data.driver_name}
                            onChange={(e) => {
                                form.clearErrors('driver_name');
                                form.setData(
                                    'driver_name',
                                    e.target.value.toUpperCase(),
                                );
                            }}
                            className="h-9 border-[#c5d5e6]"
                        />
                        <InputError message={form.errors.driver_name} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">DNI</Label>
                        <Input
                            value={form.data.driver_dni}
                            onChange={(e) =>
                                form.setData('driver_dni', e.target.value)
                            }
                            className="h-9 border-[#c5d5e6]"
                        />
                        <InputError message={form.errors.driver_dni} />
                    </div>
                </div>

                <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">Placa</Label>
                        <Input
                            value={form.data.plate_number}
                            onChange={(e) =>
                                form.setData(
                                    'plate_number',
                                    e.target.value.toUpperCase(),
                                )
                            }
                            className="h-9 border-[#c5d5e6]"
                        />
                        <InputError message={form.errors.plate_number} />
                    </div>
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Nivel alcohol %{' '}
                            <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="number"
                            step="0.001"
                            min="0"
                            max="10"
                            value={form.data.alcohol_level}
                            onChange={(e) => {
                                form.clearErrors('alcohol_level');
                                form.setData('alcohol_level', e.target.value);
                            }}
                            className="h-9 border-[#c5d5e6]"
                        />
                        <InputError message={form.errors.alcohol_level} />
                    </div>
                </div>

                {willAlert ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                        Nivel &gt; 0 → POSITIVO. No permitir ingreso. Se incluirá
                        al enviar el paquete al coordinador.
                    </p>
                ) : (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        Nivel 0 → NEGATIVO.
                    </p>
                )}

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Foto evidencia del alcohómetro{' '}
                        <span className="text-red-500">*</span>
                    </Label>
                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(event) => {
                            void setPhotoFromFile(
                                event.target.files?.[0] ?? null,
                            );
                            event.target.value = '';
                        }}
                    />
                    {form.data.evidence_photo_data_url ? (
                        <div className="relative overflow-hidden rounded-xl border border-[#d7e3f0]">
                            <img
                                src={form.data.evidence_photo_data_url}
                                alt="Evidencia"
                                className="max-h-44 w-full object-cover"
                            />
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="absolute top-2 right-2 cursor-pointer border-white/80 bg-white/90"
                                onClick={() =>
                                    form.setData('evidence_photo_data_url', '')
                                }
                                disabled={form.processing || compressing}
                            >
                                <Trash2 className="size-3.5" />
                                Quitar
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={form.processing || compressing}
                                className="cursor-pointer border-[#c5d5e6]"
                                onClick={() => fileRef.current?.click()}
                            >
                                {compressing ? (
                                    <Spinner />
                                ) : (
                                    <Camera className="size-4" />
                                )}
                                Cámara / galería
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                disabled={form.processing || compressing}
                                className="cursor-pointer border-[#c5d5e6]"
                                onClick={() => {
                                    if (fileRef.current) {
                                        fileRef.current.removeAttribute(
                                            'capture',
                                        );
                                        fileRef.current.click();
                                        fileRef.current.setAttribute(
                                            'capture',
                                            'environment',
                                        );
                                    }
                                }}
                            >
                                <ImagePlus className="size-4" />
                                Archivo
                            </Button>
                        </div>
                    )}
                    {photoError ? (
                        <p className="text-xs text-red-600">{photoError}</p>
                    ) : null}
                    <InputError
                        message={form.errors.evidence_photo_data_url}
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Lugar / área
                    </Label>
                    <Input
                        value={form.data.location}
                        onChange={(e) =>
                            form.setData('location', e.target.value)
                        }
                        className="h-9 border-[#c5d5e6]"
                        placeholder="Ej. Gate 1 / Planta"
                    />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">Notas</Label>
                    <Textarea
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        rows={2}
                        className="border-[#c5d5e6]"
                    />
                </div>
            </form>
        </AppModal>
    );
}
