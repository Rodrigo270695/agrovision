import { useForm } from '@inertiajs/react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
    InductionFormFields,
    type InductionFormOptions,
    type PeriodOption,
} from '@/components/inductions/induction-form-fields';
import type { InductionItem } from '@/components/inductions/inductions-table';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Spinner } from '@/components/ui/spinner';

export type InductionGapDraft = {
    key: string;
    title: string;
    induction_type?: string | null;
    activity: string;
    drivers: { dni: string; name: string }[];
};

type Props = {
    open: boolean;
    induction?: InductionItem | null;
    periodOptions: PeriodOption[];
    formOptions: InductionFormOptions;
    onClose: () => void;
    copying?: boolean;
    gap?: InductionGapDraft | null;
    lockedType?: string | null;
    onCreated?: (gap: InductionGapDraft) => void;
};

function sameName(left?: string | null, right?: string | null): boolean {
    const a = (left ?? '').trim().toLocaleLowerCase();
    const b = (right ?? '').trim().toLocaleLowerCase();

    return a !== '' && a === b;
}

function matchedSiteId(
    induction: InductionItem | null | undefined,
    sites: InductionFormOptions['sites'],
): string {
    if (!induction) {
        return '';
    }

    if (induction.site_id && sites.some((site) => site.id === induction.site_id)) {
        return String(induction.site_id);
    }

    const site = sites.find((item) => sameName(item.name, induction.sede ?? induction.location));

    return site ? String(site.id) : '';
}

function matchedPlaceId(
    induction: InductionItem | null | undefined,
    sites: InductionFormOptions['sites'],
): string {
    if (!induction) {
        return '';
    }

    const site = sites.find((item) => String(item.id) === matchedSiteId(induction, sites));

    if (!site) {
        return '';
    }

    if (induction.place_id && site.places.some((place) => place.id === induction.place_id)) {
        return String(induction.place_id);
    }

    const place = site.places.find((item) => sameName(item.name, induction.zone));

    return place ? String(place.id) : '';
}

const emptyValues = {
    induction_type: '',
    title: '',
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
    site_id: '',
    department: '',
    area: '',
    section: '',
    zone: '',
    place_id: '',
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
    copying = false,
    gap = null,
    lockedType = null,
    onCreated,
}: Props) {
    const completing = Boolean(gap);
    const isEditing = Boolean(induction) && !copying && !completing;
    const form = useForm(emptyValues);
    const [regulationFiles, setRegulationFiles] = useState<File[]>([]);
    const [closeOnCreate, setCloseOnCreate] = useState(true);
    const types = formOptions.types ?? [];

    useEffect(() => {
        if (!open) {
            return;
        }

        const resolvedType =
            lockedType
            ?? gap?.induction_type
            ?? induction?.induction_type
            ?? types.find((item) => item.label === (gap?.title ?? induction?.title))?.value
            ?? '';
        const typeMeta = types.find((item) => item.value === resolvedType);

        setCloseOnCreate(true);
        form.setData({
            induction_type: resolvedType,
            title: typeMeta?.label ?? gap?.title ?? induction?.title ?? '',
            temario: induction?.temario ?? '',
            activity:
                typeMeta?.activity
                ?? gap?.activity
                ?? induction?.activity
                ?? 'induccion',
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
            site_id: matchedSiteId(induction, formOptions.sites ?? []),
            department: induction?.department ?? '',
            area: induction?.area ?? '',
            section: induction?.section ?? '',
            zone: induction?.zone ?? '',
            place_id: matchedPlaceId(induction, formOptions.sites ?? []),
            target_group: induction?.target_group ?? '',
            crop: induction?.crop ?? '',
            org_unit: induction?.org_unit ?? '',
            speaker_name: induction?.speaker_name ?? '',
            speaker_institution:
                induction?.speaker_institution ?? 'AGROVISION PERÚ SAC',
            period_id: induction?.period_id ? String(induction.period_id) : '',
            status: copying ? 'scheduled' : (induction?.status ?? 'scheduled'),
            notes: induction?.notes ?? '',
        });
        form.clearErrors();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, induction?.id, gap?.title, gap?.activity, gap?.induction_type, lockedType]);

    const canSubmit = useMemo(() => {
        return (
            form.data.induction_type.trim().length > 0 &&
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
        setRegulationFiles([]);
        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!canSubmit) {
            return;
        }

        form.transform((data) => ({
            ...data,
            status: copying || completing ? 'scheduled' : data.status,
            period_id: data.period_id === '' ? null : Number(data.period_id),
            estimated_minutes:
                data.estimated_minutes === ''
                    ? null
                    : Number(data.estimated_minutes),
            corrective_action: Boolean(data.corrective_action),
            site_id: data.site_id === '' ? null : Number(data.site_id),
            place_id: data.place_id === '' ? null : Number(data.place_id),
            ...(!copying && !completing && regulationFiles.length > 0
                ? { regulations: regulationFiles }
                : {}),
            ...(completing && gap
                ? {
                      drivers: gap.drivers,
                      close_on_create: closeOnCreate,
                  }
                : {}),
        }));

        if (completing && gap) {
            form.post('/consulta-conductores/completar', {
                preserveScroll: true,
                preserveState: true,
                only: ['flash'],
                onSuccess: () => {
                    if (gap) {
                        onCreated?.(gap);
                    }
                    handleClose();
                },
                onFinish: () => form.transform((data) => data),
            });
            return;
        }

        if (copying && induction) {
            form.post(`/inducciones/${induction.id}/copiar`, {
                preserveScroll: true,
                onSuccess: () => handleClose(),
                onFinish: () => form.transform((data) => data),
            });
            return;
        }

        if (isEditing && induction) {
            form.put(`/inducciones/${induction.id}`, {
                preserveScroll: true,
                onSuccess: () => handleClose(),
                onFinish: () => form.transform((data) => data),
            });
            return;
        }

        form.post('/inducciones', {
            forceFormData: regulationFiles.length > 0,
            preserveScroll: true,
            onSuccess: () => handleClose(),
            onFinish: () => form.transform((data) => data),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title={
                completing
                    ? 'Completar faltante'
                    : copying
                      ? 'Copiar inducción'
                        : isEditing
                        ? 'Editar sesión'
                        : lockedType
                          ? 'Nueva sesión'
                          : 'Nueva sesión'
            }
            description={
                completing
                    ? `Solo los conductores que no tienen «${gap?.title ?? ''}». Completa fecha, lugar, periodo y expositor.`
                    : copying
                      ? 'Mismos datos de la inducción. Se copian los conductores con firma y huella. Los reglamentos quedan vacíos: luego solo inicias y cierras.'
                      : 'Elige el tipo del catálogo, la fecha y el lugar. El nombre ya no se escribe a mano.'
            }
            className="max-h-[min(92vh,56rem)] sm:max-w-3xl"
            bodyClassName="max-h-[min(72vh,42rem)]"
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
                        {completing
                            ? closeOnCreate
                                ? 'Crear y cerrar'
                                : 'Crear programada'
                            : copying
                              ? 'Copiar'
                              : isEditing
                                ? 'Guardar cambios'
                                : 'Crear sesión'}
                    </Button>
                </>
            }
        >
            <form id="induction-form" onSubmit={handleSubmit}>
                {completing && gap ? (
                    <div className="mb-5 rounded-xl border border-[#d7e3f0] bg-[#f7fafc] p-3">
                        <p className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                            Conductores ({gap.drivers.length})
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#5a6f8c]">
                            {gap.drivers
                                .map((driver) =>
                                    driver.name
                                        ? `${driver.name} (${driver.dni})`
                                        : driver.dni,
                                )
                                .join(' · ')}
                        </p>
                        {(form.errors as Record<string, string>).drivers ? (
                            <p className="mt-2 text-xs text-red-700">
                                {(form.errors as Record<string, string>).drivers}
                            </p>
                        ) : null}
                        <label className="mt-3 flex cursor-pointer items-start gap-2">
                            <Checkbox
                                checked={closeOnCreate}
                                onCheckedChange={(value) =>
                                    setCloseOnCreate(value === true)
                                }
                                className="mt-0.5"
                            />
                            <span>
                                <span className="block text-sm font-medium text-[#1a2b4c]">
                                    Cerrar al crear
                                </span>
                                <span className="block text-xs text-[#5a6f8c]">
                                    Queda como cerrada aunque falten firmas. El
                                    PDF consolidado las pedirá después.
                                </span>
                            </span>
                        </label>
                    </div>
                ) : null}
                <InductionFormFields
                    values={form.data}
                    errors={form.errors}
                    onChange={(field, value) => {
                        if (field === 'induction_type') {
                            const typeMeta = types.find(
                                (item) => item.value === value,
                            );
                            form.setData({
                                ...form.data,
                                induction_type: String(value),
                                title: typeMeta?.label ?? form.data.title,
                                activity:
                                    typeMeta?.activity ?? form.data.activity,
                            });

                            return;
                        }

                        form.setData(field, value);
                    }}
                    periodOptions={periodOptions}
                    formOptions={formOptions}
                    isEditing={isEditing || copying}
                    typeLocked={Boolean(lockedType) || completing || copying || isEditing}
                />
                {isEditing || copying || completing ? null : (
                    <div className="mt-5 grid gap-1.5">
                        <p className="border-b border-[#e2eaf3] pb-1 text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                            Reglamentos
                        </p>
                        <p className="text-xs text-[#5a6f8c]">
                            PDF que se envían al correo del coordinador de cada conductor cuando los jales a esta inducción.
                        </p>
                        <input
                            type="file"
                            accept="application/pdf,.pdf"
                            multiple
                            onChange={(event) => setRegulationFiles(Array.from(event.target.files ?? []))}
                            className="text-sm text-[#1a2b4c] file:mr-3 file:rounded-lg file:border file:border-[#c5d5e6] file:bg-white file:px-3 file:py-1.5"
                        />
                        {regulationFiles.length > 0 ? (
                            <p className="text-xs text-[#5a6f8c]">
                                {regulationFiles.map((file) => file.name).join(', ')}
                            </p>
                        ) : null}
                    </div>
                )}
            </form>
        </AppModal>
    );
}
