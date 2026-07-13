import { Head, router, useForm } from '@inertiajs/react';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import EvidencePhotoCapture, {
    type EvidencePhoto,
} from '@/components/evidence-photo-capture';
import InputError from '@/components/input-error';
import SignaturePad from '@/components/signature-pad';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';

type ChecklistItem = {
    id: string;
    item_code: string;
    item_number: string | null;
    label: string;
    is_group: boolean;
    requires_expiry: boolean;
    parent_item_id: string | null;
};

type SignatureSlot = {
    role: string;
    label: string;
};

type FirstAnswer = {
    item_id: string;
    complies: string | null;
    observation: string | null;
    expiry_date: string | null;
};

type Props = {
    mode: 'first' | 'second';
    template: {
        code: string;
        short_code: string;
        name: string;
    };
    version: {
        version_number: number;
        document_title: string | null;
    };
    items: ChecklistItem[];
    signatureSlots: SignatureSlot[];
    inspection: null | {
        id: string;
        plate: string;
        company_name: string | null;
        driver_name: string | null;
        license_number: string | null;
        license_class: string | null;
        license_revalidation_date: string | null;
        brand_model_year: string | null;
        location: string | null;
        additional_observations: string | null;
        first_attempt: {
            inspected_at: string | null;
            result: string | null;
        };
        first_answers: FirstAnswer[];
        signatures: Array<{ role: string; signer_name: string }>;
    };
};

type AnswerState = {
    item_id: string;
    complies: '' | 'si' | 'no' | 'na';
    observation: string;
    expiry_date: string;
};

function today(): string {
    return new Date().toISOString().slice(0, 10);
}

function nowTime(): string {
    return new Date().toTimeString().slice(0, 5);
}

function ComplianceToggle({
    value,
    onChange,
    disabled = false,
}: {
    value: string;
    onChange?: (value: 'si' | 'no' | '') => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex gap-2">
            {(['si', 'no'] as const).map((option) => {
                const active = value === option;

                return (
                    <button
                        key={option}
                        type="button"
                        disabled={disabled}
                        onClick={() =>
                            onChange?.(active ? '' : option)
                        }
                        className={cn(
                            'min-h-11 flex-1 rounded-xl text-sm font-semibold uppercase transition',
                            active
                                ? option === 'si'
                                    ? 'bg-emerald-700 text-white'
                                    : 'bg-red-700 text-white'
                                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-900',
                            disabled && 'opacity-70',
                        )}
                    >
                        {option === 'si' ? 'Sí' : 'No'}
                    </button>
                );
            })}
        </div>
    );
}

export default function InspectionForm({
    mode,
    template,
    version,
    items,
    signatureSlots,
    inspection,
}: Props) {
    const isSecond = mode === 'second';
    const answerableItems = useMemo(
        () => items.filter((item) => !item.is_group),
        [items],
    );

    const firstAnswerMap = useMemo(() => {
        const map = new Map<string, FirstAnswer>();
        inspection?.first_answers.forEach((answer) => {
            map.set(answer.item_id, answer);
        });

        return map;
    }, [inspection]);

    const { data, setData, post, processing, errors } = useForm({
        template_short_code: template.short_code,
        location: inspection?.location ?? '',
        company_name: inspection?.company_name ?? '',
        plate: inspection?.plate ?? '',
        brand: '',
        model: '',
        year: '',
        ownership_type: template.short_code === 'TDP' ? 'propia' : '',
        driver_name: inspection?.driver_name ?? '',
        license_number: inspection?.license_number ?? '',
        license_class: inspection?.license_class ?? '',
        license_revalidation_date:
            inspection?.license_revalidation_date ?? '',
        additional_observations:
            inspection?.additional_observations ?? '',
        attempt_date: today(),
        attempt_time: nowTime(),
        attempt_result: 'aprobado' as 'aprobado' | 'desaprobado',
        answers: answerableItems.map(
            (item): AnswerState => ({
                item_id: item.id,
                complies: '',
                observation: firstAnswerMap.get(item.id)?.observation ?? '',
                expiry_date: firstAnswerMap.get(item.id)?.expiry_date ?? '',
            }),
        ),
        signatures: signatureSlots.map((slot) => ({
            role: slot.role,
            signer_name:
                inspection?.signatures.find((s) => s.role === slot.role)
                    ?.signer_name ?? '',
            signature_data: null as string | null,
        })),
        photos: [] as Array<{
            data_url: string;
            latitude: number | null;
            longitude: number | null;
            accuracy: number | null;
            captured_at: string;
            checklist_item_id?: string | null;
        }>,
    });

    const [photoDrafts, setPhotoDrafts] = useState<EvidencePhoto[]>([]);

    const syncPhotos = (next: EvidencePhoto[]) => {
        setPhotoDrafts(next);
        setData(
            'photos',
            next.map((photo) => ({
                data_url: photo.dataUrl,
                latitude: photo.latitude,
                longitude: photo.longitude,
                accuracy: photo.accuracy,
                captured_at: photo.captured_at,
                checklist_item_id: photo.checklist_item_id ?? null,
            })),
        );
    };

    const updateAnswer = (
        itemId: string,
        field: keyof AnswerState,
        value: string,
    ) => {
        setData(
            'answers',
            data.answers.map((answer) =>
                answer.item_id === itemId
                    ? { ...answer, [field]: value }
                    : answer,
            ),
        );
    };

    const getAnswer = (itemId: string) =>
        data.answers.find((answer) => answer.item_id === itemId);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (isSecond && inspection) {
            post(`/inspecciones/${inspection.id}/reinspeccion`, {
                preserveScroll: true,
            });

            return;
        }

        post('/inspecciones', { preserveScroll: true });
    };

    let answeredCount = 0;
    for (const answer of data.answers) {
        if (answer.complies) {
            answeredCount += 1;
        }
    }

    return (
        <>
            <Head
                title={
                    isSecond
                        ? `2da · ${inspection?.plate}`
                        : `1ra · ${template.short_code}`
                }
            />

            <form
                onSubmit={submit}
                className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 pb-28 md:p-6"
            >
                <header className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-[#1f4d34] text-white">
                            {template.short_code}
                        </Badge>
                        <Badge variant="outline">
                            {isSecond ? '2da inspección' : '1ra inspección'}
                        </Badge>
                        <span className="text-xs text-neutral-500">
                            {template.code} · v{version.version_number}
                        </span>
                    </div>
                    <h1 className="mt-3 text-xl font-semibold tracking-tight md:text-2xl">
                        {isSecond
                            ? `Re-inspección ${inspection?.plate}`
                            : `Nueva inspección ${template.short_code}`}
                    </h1>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                        {isSecond
                            ? 'Revisa lo observado en la 1ra y registra el cumplimiento actual.'
                            : 'Completa datos y exigencias. Si desaprueba, quedará lista para una 2da inspección.'}
                    </p>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-900">
                        <div
                            className="h-full rounded-full bg-[#1f4d34] transition-all"
                            style={{
                                width: `${Math.round((answeredCount / Math.max(answerableItems.length, 1)) * 100)}%`,
                            }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-neutral-500">
                        {answeredCount}/{answerableItems.length} ítems
                        respondidos · Los campos con{' '}
                        <span className="font-semibold text-red-600">*</span>{' '}
                        son obligatorios
                    </p>
                </header>

                {isSecond && inspection ? (
                    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                        <p className="font-semibold">Resumen 1ra inspección</p>
                        <p className="mt-1">
                            Resultado:{' '}
                            <span className="font-semibold capitalize">
                                {inspection.first_attempt.result}
                            </span>
                        </p>
                        <p>
                            Fecha:{' '}
                            {inspection.first_attempt.inspected_at
                                ? new Date(
                                      inspection.first_attempt.inspected_at,
                                  ).toLocaleString('es-PE')
                                : '—'}
                        </p>
                        <p className="mt-1">
                            {inspection.driver_name} ·{' '}
                            {inspection.company_name}
                        </p>
                        {inspection.brand_model_year ? (
                            <p>{inspection.brand_model_year}</p>
                        ) : null}
                    </section>
                ) : null}

                <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                    <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-600 uppercase">
                        Datos de la unidad
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Fecha" required error={errors.attempt_date}>
                            <Input
                                type="date"
                                className="h-11"
                                value={data.attempt_date}
                                onChange={(e) =>
                                    setData('attempt_date', e.target.value)
                                }
                            />
                        </Field>
                        <Field label="Hora" required error={errors.attempt_time}>
                            <Input
                                type="time"
                                className="h-11"
                                value={data.attempt_time}
                                onChange={(e) =>
                                    setData('attempt_time', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Resultado"
                            required
                            error={errors.attempt_result}
                        >
                            <select
                                className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                                value={data.attempt_result}
                                onChange={(e) =>
                                    setData(
                                        'attempt_result',
                                        e.target.value as
                                            | 'aprobado'
                                            | 'desaprobado',
                                    )
                                }
                            >
                                <option value="aprobado">Aprobado</option>
                                <option value="desaprobado">Desaprobado</option>
                            </select>
                        </Field>
                        <Field label="Lugar" error={errors.location}>
                            <Input
                                className="h-11"
                                value={data.location}
                                disabled={isSecond}
                                onChange={(e) =>
                                    setData('location', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Empresa de transporte"
                            required={!isSecond}
                            error={errors.company_name}
                        >
                            <Input
                                className="h-11"
                                value={data.company_name}
                                disabled={isSecond}
                                onChange={(e) =>
                                    setData('company_name', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Placa"
                            required={!isSecond}
                            error={errors.plate}
                        >
                            <Input
                                className="h-11 font-mono text-base tracking-wide"
                                value={data.plate}
                                disabled={isSecond}
                                onChange={(e) =>
                                    setData(
                                        'plate',
                                        e.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="ABC-123"
                            />
                        </Field>
                        {!isSecond ? (
                            <>
                                <Field label="Marca" error={errors.brand}>
                                    <Input
                                        className="h-11"
                                        value={data.brand}
                                        onChange={(e) =>
                                            setData('brand', e.target.value)
                                        }
                                    />
                                </Field>
                                <Field label="Modelo" error={errors.model}>
                                    <Input
                                        className="h-11"
                                        value={data.model}
                                        onChange={(e) =>
                                            setData('model', e.target.value)
                                        }
                                    />
                                </Field>
                                <Field label="Año" error={errors.year}>
                                    <Input
                                        type="number"
                                        className="h-11"
                                        value={data.year}
                                        onChange={(e) =>
                                            setData('year', e.target.value)
                                        }
                                    />
                                </Field>
                            </>
                        ) : null}
                        <Field
                            label="Conductor"
                            required={!isSecond}
                            error={errors.driver_name}
                        >
                            <Input
                                className="h-11"
                                value={data.driver_name}
                                disabled={isSecond}
                                onChange={(e) =>
                                    setData('driver_name', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="N° licencia"
                            required={!isSecond}
                            error={errors.license_number}
                        >
                            <Input
                                className="h-11"
                                value={data.license_number}
                                disabled={isSecond}
                                onChange={(e) =>
                                    setData('license_number', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Clase / categoría"
                            error={errors.license_class}
                        >
                            <Input
                                className="h-11"
                                value={data.license_class}
                                disabled={isSecond}
                                onChange={(e) =>
                                    setData('license_class', e.target.value)
                                }
                            />
                        </Field>
                        <Field
                            label="Revalidación"
                            error={errors.license_revalidation_date}
                        >
                            <Input
                                type="date"
                                className="h-11"
                                value={data.license_revalidation_date}
                                disabled={isSecond}
                                onChange={(e) =>
                                    setData(
                                        'license_revalidation_date',
                                        e.target.value,
                                    )
                                }
                            />
                        </Field>
                    </div>
                </section>

                <section className="space-y-3">
                    <h2 className="text-sm font-semibold tracking-wide text-neutral-600 uppercase">
                        Exigencias mínimas de seguridad
                    </h2>

                    {items.map((item) => {
                        if (item.is_group) {
                            return (
                                <div
                                    key={item.id}
                                    className="rounded-xl bg-[#1f4d34] px-4 py-3 text-sm font-semibold text-white"
                                >
                                    {item.item_number}. {item.label}
                                </div>
                            );
                        }

                        const answer = getAnswer(item.id);
                        const previous = firstAnswerMap.get(item.id);
                        const isChild = Boolean(item.parent_item_id);

                        return (
                            <article
                                key={item.id}
                                className={cn(
                                    'rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950',
                                    isChild && 'ml-2 border-l-4 border-l-emerald-700/40',
                                )}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-semibold tracking-wide text-neutral-400">
                                            Ítem {item.item_number}
                                        </p>
                                        <h3 className="mt-1 text-sm font-medium leading-snug md:text-base">
                                            {item.label}{' '}
                                            <span
                                                className="text-red-600"
                                                aria-hidden
                                            >
                                                *
                                            </span>
                                        </h3>
                                    </div>
                                </div>

                                {isSecond && previous ? (
                                    <div className="mt-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-900 dark:text-neutral-300">
                                        1ra:{' '}
                                        <span className="font-semibold uppercase">
                                            {previous.complies ?? '—'}
                                        </span>
                                        {previous.observation
                                            ? ` · ${previous.observation}`
                                            : ''}
                                    </div>
                                ) : null}

                                <div className="mt-3 space-y-3">
                                    <ComplianceToggle
                                        value={answer?.complies ?? ''}
                                        onChange={(value) =>
                                            updateAnswer(
                                                item.id,
                                                'complies',
                                                value,
                                            )
                                        }
                                    />

                                    {item.requires_expiry ? (
                                        <div className="grid gap-1.5">
                                            <Label className="text-xs">
                                                Fecha de vencimiento{' '}
                                                <span
                                                    className="text-red-600"
                                                    aria-hidden
                                                >
                                                    *
                                                </span>
                                            </Label>
                                            <Input
                                                type="date"
                                                className="h-11"
                                                value={
                                                    answer?.expiry_date ?? ''
                                                }
                                                onChange={(e) =>
                                                    updateAnswer(
                                                        item.id,
                                                        'expiry_date',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </div>
                                    ) : null}

                                    <Input
                                        className="h-11"
                                        value={answer?.observation ?? ''}
                                        onChange={(e) =>
                                            updateAnswer(
                                                item.id,
                                                'observation',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Observación (opcional)"
                                    />
                                </div>
                            </article>
                        );
                    })}
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                    <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-600 uppercase">
                        Observaciones adicionales
                    </h2>
                    <textarea
                        className="min-h-28 w-full rounded-xl border border-input bg-transparent px-3 py-3 text-sm"
                        value={data.additional_observations}
                        onChange={(e) =>
                            setData(
                                'additional_observations',
                                e.target.value,
                            )
                        }
                        placeholder="Sobrecupo, hallazgos u otras notas..."
                    />
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                    <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-600 uppercase">
                        Evidencia fotográfica
                    </h2>
                    <p className="mb-3 text-sm text-neutral-500">
                        Toma fotos desde el celular. Se sellan con fecha, hora y
                        coordenadas GPS para verificación en campo.
                    </p>
                    <EvidencePhotoCapture
                        photos={photoDrafts}
                        onChange={syncPhotos}
                    />
                    <InputError message={errors.photos as string | undefined} />
                </section>

                <section className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-950">
                    <h2 className="mb-3 text-sm font-semibold tracking-wide text-neutral-600 uppercase">
                        Firmas digitales / V°B°
                    </h2>
                    <div className="grid gap-5">
                        {signatureSlots.map((slot, index) => (
                            <div
                                key={slot.role}
                                className="space-y-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800"
                            >
                                <Field
                                    label={slot.label}
                                    required
                                    error={
                                        errors[
                                            `signatures.${index}.signer_name` as keyof typeof errors
                                        ]
                                    }
                                >
                                    <Input
                                        className="h-11"
                                        value={
                                            data.signatures[index]
                                                ?.signer_name ?? ''
                                        }
                                        onChange={(e) => {
                                            const next = [...data.signatures];
                                            next[index] = {
                                                ...next[index],
                                                role: slot.role,
                                                signer_name: e.target.value,
                                            };
                                            setData('signatures', next);
                                        }}
                                        placeholder="Nombre y apellido"
                                    />
                                </Field>
                                <div className="space-y-2">
                                    <Label>
                                        Firma digital{' '}
                                        <span
                                            className="text-red-600"
                                            aria-hidden
                                        >
                                            *
                                        </span>
                                    </Label>
                                    <SignaturePad
                                        value={
                                            data.signatures[index]
                                                ?.signature_data ?? null
                                        }
                                        onChange={(signatureData) => {
                                            const next = [...data.signatures];
                                            next[index] = {
                                                ...next[index],
                                                role: slot.role,
                                                signature_data: signatureData,
                                            };
                                            setData('signatures', next);
                                        }}
                                        label="Firme en pantalla con el dedo"
                                    />
                                </div>
                                <InputError
                                    message={
                                        errors[
                                            `signatures.${index}.signature_data` as keyof typeof errors
                                        ]
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/95 p-3 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none dark:border-neutral-800 dark:bg-neutral-950/95">
                    <div className="mx-auto flex w-full max-w-3xl gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 flex-1"
                            onClick={() => router.visit('/inspecciones')}
                        >
                            Volver
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            className="h-12 flex-[1.4] bg-[#1f4d34] hover:bg-[#163828]"
                        >
                            {processing
                                ? 'Guardando...'
                                : isSecond
                                  ? 'Guardar 2da inspección'
                                  : 'Guardar 1ra inspección'}
                        </Button>
                    </div>
                </div>
            </form>
        </>
    );
}

function Field({
    label,
    error,
    required = false,
    children,
}: {
    label: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <Label>
                {label}
                {required ? (
                    <span className="ml-0.5 text-red-600" aria-hidden>
                        *
                    </span>
                ) : null}
            </Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

InspectionForm.layout = {
    breadcrumbs: [
        { title: 'Panel', href: dashboard() },
        { title: 'Checklists SST', href: '/inspecciones' },
        { title: 'Inspección', href: '#' },
    ],
};
