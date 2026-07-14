import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';
import {
    UnitFormFields,
    type PeriodOption,
} from '@/components/units/unit-form-fields';
import type { UnitItem } from '@/components/units/units-table';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    open: boolean;
    unit?: UnitItem | null;
    periodOptions: PeriodOption[];
    onClose: () => void;
};

const emptyValues = {
    period_id: '',
    correlative: '',
    phone: '',
    email: '',
    provider: '',
    route: '',
    vehicle_type: '',
    service_date: '',
    driver_name: '',
    plate_number: '',
    responsible_person: '',
    service_type: '',
    ruc: '',
    driver_dni: '',
    category: '',
    coordinator: '',
};

function toFormValues(unit?: UnitItem | null) {
    if (!unit) {
        return emptyValues;
    }

    return {
        period_id: unit.period_id ? String(unit.period_id) : '',
        correlative: unit.correlative ?? '',
        phone: unit.phone ?? '',
        email: unit.email ?? '',
        provider: unit.provider ?? '',
        route: unit.route ?? '',
        vehicle_type: unit.vehicle_type ?? '',
        service_date: unit.service_date
            ? String(unit.service_date).slice(0, 10)
            : '',
        driver_name: unit.driver_name ?? '',
        plate_number: unit.plate_number ?? '',
        responsible_person: unit.responsible_person ?? '',
        service_type: unit.service_type ?? '',
        ruc: unit.ruc ?? '',
        driver_dni: unit.driver_dni ?? '',
        category: unit.category ?? '',
        coordinator: unit.coordinator ?? '',
    };
}

export function UnitFormModal({
    open,
    unit = null,
    periodOptions,
    onClose,
}: Props) {
    const isEditing = Boolean(unit);
    const form = useForm(emptyValues);

    useEffect(() => {
        if (!open) {
            return;
        }

        const values = toFormValues(unit);

        if (!values.period_id) {
            const active = periodOptions.find((item) => item.status === 'active');
            values.period_id = active
                ? String(active.id)
                : periodOptions[0]
                  ? String(periodOptions[0].id)
                  : '';
        }

        form.setData(values);
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, unit?.id, periodOptions]);

    const canSubmit = useMemo(() => {
        return (
            form.data.period_id.length > 0 &&
            form.data.correlative.trim().length > 0 &&
            form.data.provider.trim().length > 0 &&
            !form.processing
        );
    }, [
        form.data.period_id,
        form.data.correlative,
        form.data.provider,
        form.processing,
    ]);

    const handleClose = () => {
        form.reset();
        form.clearErrors();
        form.setData(emptyValues);
        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        form.transform((data) => ({
            ...data,
            period_id: Number(data.period_id),
        }));

        if (isEditing && unit) {
            form.put(`/unidades/${unit.id}`, {
                preserveScroll: true,
                onSuccess: () => handleClose(),
                onFinish: () => form.transform((data) => data),
            });
            return;
        }

        form.post('/unidades', {
            preserveScroll: true,
            onSuccess: () => handleClose(),
            onFinish: () => form.transform((data) => data),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title={isEditing ? 'Editar unidad' : 'Nueva unidad'}
            description={
                isEditing
                    ? 'Actualiza los datos de la unidad seleccionada.'
                    : 'Completa los datos para registrar una nueva unidad.'
            }
            className="sm:max-w-2xl"
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
                        form="unit-form"
                        disabled={!canSubmit}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        {isEditing ? 'Guardar cambios' : 'Crear unidad'}
                    </Button>
                </>
            }
        >
            <form id="unit-form" onSubmit={handleSubmit}>
                <UnitFormFields
                    values={form.data}
                    errors={form.errors}
                    onChange={(field, value) => form.setData(field, value)}
                    periodOptions={periodOptions}
                />
            </form>
        </AppModal>
    );
}
