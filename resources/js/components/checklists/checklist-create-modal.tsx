import { router } from '@inertiajs/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AppModal } from '@/components/shared/app-modal';
import { SearchableCombobox } from '@/components/shared/searchable-combobox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import type { ChecklistFormData } from '@/components/checklists/checklist-edit-form';
import type { OfflineCatalogTemplate } from '@/lib/offline/db';
import { isBrowserOnline } from '@/lib/offline/ids';
import {
    buildLocalDraft,
    queueCreate,
    saveEditSnapshot,
} from '@/lib/offline/store';

export type ChecklistTemplateOption = {
    id: number;
    type: string;
    code: string;
    name: string;
    label?: string;
};

export type ActiveUnitOption = {
    id: number;
    period_id: number;
    correlative: string;
    plate_number?: string | null;
    driver_name?: string | null;
    provider?: string | null;
    category?: string | null;
    vehicle_type?: string | null;
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
    catalog?: OfflineCatalogTemplate[];
    onClose: () => void;
    onCreatedOffline?: (draft: ChecklistFormData) => void;
};

function todayInput(): string {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

    return local.toISOString().slice(0, 10);
}

function templateTypeForVehicle(vehicleType: string | null | undefined): 'tdp' | 'tdc' {
    const value = (vehicleType ?? '').trim().toUpperCase();

    if (value.includes('CAMIONETA') || value.includes('PICK') || value === 'TDC') {
        return 'tdc';
    }

    return 'tdp';
}

export function ChecklistCreateModal({
    open,
    templates,
    activeUnits,
    catalog = [],
    onClose,
    onCreatedOffline,
}: Props) {
    const [date, setDate] = useState(todayInput);
    const [unitId, setUnitId] = useState<string | null>(null);
    const [templateId, setTemplateId] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!open) {
            return;
        }

        setDate(todayInput());
        setUnitId(null);
        setTemplateId(null);
    }, [open]);

    const options = useMemo(
        () =>
            activeUnits.map((unit) => {
                const plate = unit.plate_number || unit.correlative;

                return {
                    value: String(unit.id),
                    label: plate,
                    description: [
                        unit.driver_name || 'Sin conductor',
                        unit.vehicle_type || null,
                        unit.period?.name || null,
                    ]
                        .filter(Boolean)
                        .join(' · '),
                    keywords: [
                        plate,
                        unit.driver_name,
                        unit.vehicle_type,
                        unit.correlative,
                    ]
                        .filter(Boolean)
                        .join(' '),
                };
            }),
        [activeUnits],
    );

    const unit = useMemo(
        () => activeUnits.find((item) => String(item.id) === unitId) ?? null,
        [activeUnits, unitId],
    );

    const suggestedType = unit
        ? templateTypeForVehicle(unit.vehicle_type)
        : null;
    const suggested = suggestedType
        ? (templates.find((item) => item.type === suggestedType) ?? null)
        : null;
    const template =
        templates.find((item) => String(item.id) === templateId) ?? null;
    const templateOptions = useMemo(
        () =>
            templates.map((item) => ({
                value: String(item.id),
                label: item.label || item.type.toUpperCase(),
            })),
        [templates],
    );

    const selectUnit = (value: string | null) => {
        setUnitId(value);

        const next =
            activeUnits.find((item) => String(item.id) === value) ?? null;

        if (!next) {
            setTemplateId(null);

            return;
        }

        const type = templateTypeForVehicle(next.vehicle_type);
        const match = templates.find((item) => item.type === type);
        setTemplateId(match ? String(match.id) : null);
    };

    const handleClose = () => {
        if (sending) {
            return;
        }

        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!unit || !template || sending) {
            return;
        }

        if (!isBrowserOnline()) {
            const templateCatalog = catalog.find(
                (item) => item.id === template.id,
            );

            if (!templateCatalog) {
                toast.error(
                    'Abre Inspecciones con conexión una vez para poder crearlas sin internet.',
                );

                return;
            }

            setSending(true);
            const draft = buildLocalDraft({
                unit,
                template,
                catalog: templateCatalog,
            });
            draft.first_inspected_on = date;

            void (async () => {
                try {
                    await saveEditSnapshot(draft);
                    await queueCreate({
                        unit_id: unit.id,
                        template_id: template.id,
                        inspected_on: date,
                        checklistId: String(draft.id),
                    });
                    toast.success(
                        'Guardado en este dispositivo. Se enviará al reconectar.',
                    );
                    onCreatedOffline?.(draft);
                    onClose();
                } catch {
                    toast.error(
                        'No se pudo guardar la inspección en el dispositivo.',
                    );
                } finally {
                    setSending(false);
                }
            })();

            return;
        }

        setSending(true);
        router.post(
            '/inspecciones',
            {
                unit_id: unit.id,
                template_id: template.id,
                inspected_on: date,
            },
            {
                preserveScroll: true,
                onFinish: () => setSending(false),
                onSuccess: () => onClose(),
            },
        );
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title="Nueva inspección"
            description="Elige la fecha, la unidad y el checklist. Se abre esa inspección para completarla."
            className="sm:max-w-lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={sending}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        form="checklist-create-form"
                        disabled={!unit || !template || sending}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {sending ? <Spinner /> : null}
                        Crear inspección
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
                        Fecha <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        className="h-10 border-[#c5d5e6]"
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Unidad <span className="text-red-500">*</span>
                    </Label>
                    <SearchableCombobox
                        value={unitId}
                        options={options}
                        onChange={selectUnit}
                        placeholder="Buscar placa o conductor"
                        emptyMessage="No hay unidades en el periodo activo"
                    />
                </div>
                <div className="grid gap-1.5">
                    <Label className="text-xs text-[#1a2b4c]">
                        Checklist <span className="text-red-500">*</span>
                    </Label>
                    <SearchableCombobox
                        value={templateId}
                        options={templateOptions}
                        onChange={setTemplateId}
                        placeholder="Elige el checklist"
                        emptyMessage="No hay plantillas activas"
                        allowClear={false}
                    />
                    {unit && suggested ? (
                        <p className="text-[11px] text-[#5a7390]">
                            Sugerido por el vehículo: {suggested.label || suggested.type.toUpperCase()}
                            {unit.vehicle_type ? ` · ${unit.vehicle_type}` : ''}
                        </p>
                    ) : null}
                </div>
            </form>
        </AppModal>
    );
}
