import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';
import type { UnitOption } from '@/components/alcohol-tests/alcohol-tests-table';
import { AppModal } from '@/components/shared/app-modal';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';

type Props = {
    open: boolean;
    unitOptions: UnitOption[];
    onClose: () => void;
};

function nowLocalInput(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function AlcoholTestFormModal({ open, unitOptions, onClose }: Props) {
    const form = useForm({
        unit_id: '' as string,
        tested_at: nowLocalInput(),
        driver_name: '',
        driver_dni: '',
        plate_number: '',
        alcohol_level: '0',
        location: '',
        notes: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            unit_id: '',
            tested_at: nowLocalInput(),
            driver_name: '',
            driver_dni: '',
            plate_number: '',
            alcohol_level: '0',
            location: '',
            notes: '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const selectedUnit = useMemo(
        () =>
            unitOptions.find(
                (item) => String(item.id) === form.data.unit_id,
            ) ?? null,
        [unitOptions, form.data.unit_id],
    );

    const applyUnit = (unitId: string) => {
        const unit = unitOptions.find((item) => String(item.id) === unitId);

        if (!unit) {
            form.setData('unit_id', unitId);

            return;
        }

        form.setData({
            ...form.data,
            unit_id: unitId,
            driver_name: (unit.driver_name ?? form.data.driver_name).toUpperCase(),
            driver_dni: unit.driver_dni ?? form.data.driver_dni,
            plate_number: (
                unit.plate_number ?? form.data.plate_number
            ).toUpperCase(),
        });
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        form.transform((data) => ({
            unit_id: data.unit_id === '' ? null : Number(data.unit_id),
            tested_at: data.tested_at,
            driver_name: data.driver_name,
            driver_dni: data.driver_dni || null,
            plate_number: data.plate_number || null,
            alcohol_level: Number(data.alcohol_level),
            location: data.location || null,
            notes: data.notes || null,
        }));

        form.post('/alcoholimetro', {
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
                if (!form.processing) {
                    onClose();
                }
            }}
            title="Nuevo test de alcohómetro"
            description="Tolerancia 0. Si el nivel es mayor a 0 se alerta al coordinador de la unidad."
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
                        form="alcohol-test-form"
                        disabled={form.processing}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        {form.processing ? <Spinner /> : null}
                        Registrar test
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
                    <Label className="text-xs text-[#1a2b4c]">
                        Unidad (opcional)
                    </Label>
                    <select
                        value={form.data.unit_id}
                        onChange={(event) => applyUnit(event.target.value)}
                        className="h-9 w-full cursor-pointer rounded-md border border-[#c5d5e6] bg-white px-3 text-sm text-[#1a2b4c]"
                    >
                        <option value="">Sin vincular unidad</option>
                        {unitOptions.map((unit) => (
                            <option key={unit.id} value={String(unit.id)}>
                                {unit.label}
                            </option>
                        ))}
                    </select>
                    {selectedUnit && !selectedUnit.coordinator_id ? (
                        <p className="text-[11px] text-amber-700">
                            Esta unidad no tiene coordinador asignado; el
                            positivo aún se registra, pero la push puede no
                            llegar a alguien específico.
                        </p>
                    ) : null}
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Fecha y hora <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        type="datetime-local"
                        value={form.data.tested_at}
                        onChange={(e) =>
                            form.setData('tested_at', e.target.value)
                        }
                        className="h-9 border-[#c5d5e6]"
                    />
                    <InputError message={form.errors.tested_at} />
                </div>

                <div className="grid gap-1.5 sm:grid-cols-2 sm:gap-3">
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Conductor <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={form.data.driver_name}
                            onChange={(e) =>
                                form.setData(
                                    'driver_name',
                                    e.target.value.toUpperCase(),
                                )
                            }
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
                            onChange={(e) =>
                                form.setData('alcohol_level', e.target.value)
                            }
                            className="h-9 border-[#c5d5e6]"
                        />
                        <InputError message={form.errors.alcohol_level} />
                    </div>
                </div>

                {willAlert ? (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                        Nivel &gt; 0 → POSITIVO. Se enviará alerta push al
                        coordinador. No permitir ingreso.
                    </p>
                ) : (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        Nivel 0 → NEGATIVO (tolerancia cero cumplida).
                    </p>
                )}

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
                    <InputError message={form.errors.location} />
                </div>

                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">Notas</Label>
                    <Textarea
                        value={form.data.notes}
                        onChange={(e) => form.setData('notes', e.target.value)}
                        rows={3}
                        className="border-[#c5d5e6]"
                    />
                    <InputError message={form.errors.notes} />
                </div>
            </form>
        </AppModal>
    );
}
