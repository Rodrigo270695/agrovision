import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { SearchableCombobox } from '@/components/shared/searchable-combobox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

export type ChecklistTemplateOption = {
    id: number;
    type: string;
    code: string;
    name: string;
};

export type ActiveUnitOption = {
    id: number;
    period_id: number;
    correlative: string;
    plate_number?: string | null;
    driver_name?: string | null;
    provider?: string | null;
    category?: string | null;
    period?: {
        id: number;
        name: string;
        status?: string;
    } | null;
};

type Props = {
    open: boolean;
    templates: ChecklistTemplateOption[];
    activeUnits: ActiveUnitOption[];
    onClose: () => void;
};

export function ChecklistCreateModal({
    open,
    templates,
    activeUnits,
    onClose,
}: Props) {
    const form = useForm({
        unit_id: '',
        template_id: '',
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            unit_id: '',
            template_id: templates[0] ? String(templates[0].id) : '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, templates]);

    const selectedUnit = activeUnits.find(
        (unit) => String(unit.id) === form.data.unit_id,
    );

    const plateOptions = useMemo(
        () =>
            activeUnits.map((unit) => {
                const plate = unit.plate_number || unit.correlative;

                return {
                    value: String(unit.id),
                    label: plate,
                    description: unit.period?.name ?? 'Periodo',
                    keywords: [
                        plate,
                        unit.driver_name,
                        unit.provider,
                        unit.correlative,
                        unit.period?.name,
                    ]
                        .filter(Boolean)
                        .join(' '),
                };
            }),
        [activeUnits],
    );

    const handleClose = () => {
        if (form.processing) {
            return;
        }

        form.reset();
        form.clearErrors();
        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        form.post('/inspecciones', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onClose();
            },
        });
    };

    const canSubmit =
        form.data.unit_id !== '' &&
        form.data.template_id !== '' &&
        !form.processing;

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title="Nueva inspección"
            description="Selecciona la placa de una unidad del periodo activo y el tipo de checklist."
            className="sm:max-w-lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={form.processing}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="checklist-create-form"
                        disabled={!canSubmit}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        Crear e inspeccionar
                    </Button>
                </>
            }
        >
            <form
                id="checklist-create-form"
                onSubmit={handleSubmit}
                className="space-y-3"
            >
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Tipo de checklist{' '}
                        <span className="text-red-500">*</span>
                    </Label>
                    <Select
                        value={form.data.template_id || 'none'}
                        onValueChange={(value) => {
                            if (value === 'none') {
                                return;
                            }

                            form.setData('template_id', value);
                        }}
                    >
                        <SelectTrigger className="h-10 w-full cursor-pointer border-[#c5d5e6] bg-white text-[#1a2b4c]">
                            <SelectValue placeholder="Selecciona tipo" />
                        </SelectTrigger>
                        <SelectContent className="border-[#d7e3f0] bg-white">
                            {templates.length === 0 ? (
                                <SelectItem value="none" disabled>
                                    Sin plantillas
                                </SelectItem>
                            ) : (
                                templates.map((template) => (
                                    <SelectItem
                                        key={template.id}
                                        value={String(template.id)}
                                        className="cursor-pointer"
                                    >
                                        {template.type.toUpperCase()} —{' '}
                                        {template.code}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                    {form.errors.template_id ? (
                        <p className="text-xs text-red-600">
                            {form.errors.template_id}
                        </p>
                    ) : null}
                </div>

                <div className="grid gap-1.5">
                    <Label
                        htmlFor="checklist-create-plate"
                        className="text-xs text-[#1a2b4c]"
                    >
                        Placa (unidad del periodo activo){' '}
                        <span className="text-red-500">*</span>
                    </Label>
                    <SearchableCombobox
                        id="checklist-create-plate"
                        value={form.data.unit_id || null}
                        options={plateOptions}
                        onChange={(next) =>
                            form.setData('unit_id', next ?? '')
                        }
                        placeholder="Escribe la placa..."
                        emptyMessage={
                            activeUnits.length === 0
                                ? 'No hay unidades en periodo activo'
                                : 'Sin coincidencias'
                        }
                        disabled={form.processing}
                    />
                    {form.errors.unit_id ? (
                        <p className="text-xs text-red-600">
                            {form.errors.unit_id}
                        </p>
                    ) : null}
                </div>

                {selectedUnit ? (
                    <div className="rounded-xl border border-[#d7e3f0] bg-[#f8fafc] p-3 text-xs text-[#5a7390]">
                        <p className="font-semibold text-[#1a2b4c]">
                            Datos jalados de la unidad
                        </p>
                        <p className="mt-1">
                            Conductor: {selectedUnit.driver_name || '—'}
                        </p>
                        <p>Proveedor: {selectedUnit.provider || '—'}</p>
                        <p>
                            Categoría / brevete:{' '}
                            {selectedUnit.category || '—'}
                        </p>
                    </div>
                ) : null}
            </form>
        </AppModal>
    );
}
