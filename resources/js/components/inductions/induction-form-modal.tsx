import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, type FormEvent } from 'react';
import {
    InductionFormFields,
    type InductionFormOptions,
    type PeriodOption,
} from '@/components/inductions/induction-form-fields';
import type { InductionItem } from '@/components/inductions/inductions-table';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

type Props = {
    open: boolean;
    induction?: InductionItem | null;
    periodOptions: PeriodOption[];
    formOptions: InductionFormOptions;
    onClose: () => void;
};

const emptyValues = {
    title: '',
    document_code: 'GH-GD-FO-0609',
    document_revision: '006',
    temario: '',
    activity: 'induccion',
    corrective_action: false,
    modality: 'interna',
    school: 'sig',
    categories: ['seguridad_salud_trabajo'] as string[],
    category_other: '',
    session_date: '',
    start_time: '',
    end_time: '',
    estimated_minutes: '60',
    sede: '',
    department: '',
    area: '',
    section: '',
    zone: '',
    target_group: '',
    crop: '',
    org_unit: '',
    speaker_name: '',
    speaker_institution: 'AGROVISION PERÚ SAC',
    period_id: '',
    status: 'scheduled',
    notes: '',
};

function timeValue(value?: string | null): string {
    if (!value) {
        return '';
    }

    return String(value).slice(0, 5);
}

function dateValue(value?: string | null): string {
    if (!value) {
        return '';
    }

    return String(value).slice(0, 10);
}

export function InductionFormModal({
    open,
    induction = null,
    periodOptions,
    formOptions,
    onClose,
}: Props) {
    const isEditing = Boolean(induction);
    const form = useForm(emptyValues);

    useEffect(() => {
        if (!open) {
            return;
        }

        form.setData({
            title: induction?.title ?? '',
            document_code: induction?.document_code ?? 'GH-GD-FO-0609',
            document_revision: induction?.document_revision ?? '006',
            temario: induction?.temario ?? '',
            activity: induction?.activity ?? 'induccion',
            corrective_action: Boolean(induction?.corrective_action),
            modality: induction?.modality ?? 'interna',
            school: induction?.school ?? 'sig',
            categories: induction?.categories?.length
                ? induction.categories
                : ['seguridad_salud_trabajo'],
            category_other: induction?.category_other ?? '',
            session_date: dateValue(
                induction?.session_date ?? induction?.scheduled_at,
            ),
            start_time: timeValue(
                induction?.start_time ??
                    (induction?.scheduled_at
                        ? new Date(induction.scheduled_at)
                              .toTimeString()
                              .slice(0, 5)
                        : ''),
            ),
            end_time: timeValue(induction?.end_time),
            estimated_minutes: induction?.estimated_minutes
                ? String(induction.estimated_minutes)
                : '60',
            sede: induction?.sede ?? induction?.location ?? '',
            department: induction?.department ?? '',
            area: induction?.area ?? '',
            section: induction?.section ?? '',
            zone: induction?.zone ?? '',
            target_group: induction?.target_group ?? '',
            crop: induction?.crop ?? '',
            org_unit: induction?.org_unit ?? '',
            speaker_name: induction?.speaker_name ?? '',
            speaker_institution:
                induction?.speaker_institution ?? 'AGROVISION PERÚ SAC',
            period_id: induction?.period_id ? String(induction.period_id) : '',
            status: induction?.status ?? 'scheduled',
            notes: induction?.notes ?? '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, induction?.id]);

    const canSubmit = useMemo(() => {
        return (
            form.data.title.trim().length > 0 &&
            form.data.document_code.trim().length > 0 &&
            form.data.document_revision.trim().length > 0 &&
            form.data.period_id.length > 0 &&
            form.data.session_date.length > 0 &&
            form.data.start_time.length > 0 &&
            form.data.end_time.length > 0 &&
            form.data.categories.length > 0 &&
            !form.processing
        );
    }, [form.data, form.processing]);

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
            period_id: data.period_id === '' ? null : Number(data.period_id),
            estimated_minutes:
                data.estimated_minutes === ''
                    ? null
                    : Number(data.estimated_minutes),
            corrective_action: Boolean(data.corrective_action),
        }));

        if (isEditing && induction) {
            form.put(`/inducciones/${induction.id}`, {
                preserveScroll: true,
                onSuccess: () => handleClose(),
                onFinish: () => form.transform((data) => data),
            });
            return;
        }

        form.post('/inducciones', {
            preserveScroll: true,
            onSuccess: () => handleClose(),
            onFinish: () => form.transform((data) => data),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title={isEditing ? 'Editar inducción' : 'Nueva inducción'}
            description="Completa los campos del formato GH-GD-FO-0609."
            className="sm:max-w-3xl"
            bodyClassName="max-h-[70vh]"
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
                        form="induction-form"
                        disabled={!canSubmit}
                        className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c] disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        {isEditing ? 'Guardar cambios' : 'Crear inducción'}
                    </Button>
                </>
            }
        >
            <form id="induction-form" onSubmit={handleSubmit}>
                <InductionFormFields
                    values={form.data}
                    errors={form.errors}
                    onChange={(field, value) => form.setData(field, value)}
                    periodOptions={periodOptions}
                    formOptions={formOptions}
                    isEditing={isEditing}
                />
            </form>
        </AppModal>
    );
}
