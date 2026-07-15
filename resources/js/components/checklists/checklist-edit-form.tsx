import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    CheckCircle2,
    FileDown,
    Lock,
    ShieldCheck,
} from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import {
    ChecklistPhotosSection,
    type ChecklistPhoto,
} from '@/components/checklists/checklist-photos-section';
import { SignaturePad } from '@/components/checklists/signature-pad';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export type ChecklistFormItem = {
    id: number;
    parent_id: number | null;
    item_number: string | null;
    label: string;
    sort_order: number;
    has_expiry: boolean;
    check_type: 'observation' | 'expiry' | string;
    weight: number | null;
    first_value: 'yes' | 'no' | null;
    second_value: 'yes' | 'no' | null;
    observations: string | null;
};

export type ChecklistFormSignature = {
    signature_role_id: number;
    label: string;
    signer_name: string | null;
    signature_url?: string | null;
    signed_at?: string | null;
};

export type ChecklistFormData = {
    id: number;
    status: 'draft' | 'completed';
    is_sealed: boolean;
    sealed_at: string | null;
    plate_number: string;
    driver_name: string | null;
    provider: string | null;
    location: string | null;
    transport_company: string | null;
    vehicle_info: string | null;
    license_number: string | null;
    license_class: string | null;
    license_revalidation_on: string | null;
    first_inspected_on: string | null;
    first_inspected_time: string | null;
    second_inspected_on: string | null;
    second_inspected_time: string | null;
    first_result: 'approved' | 'rejected' | null;
    second_result: 'approved' | 'rejected' | null;
    additional_observations: string | null;
    period?: {
        id: number;
        name: string;
        date?: string;
        status?: string;
    } | null;
    template: {
        id: number;
        type: string;
        code: string;
        name: string;
        version: string;
        notes_hint: string | null;
    };
    items: ChecklistFormItem[];
    pareto?: {
        weight_total: number;
        weight_ok: boolean;
    };
    signatures: ChecklistFormSignature[];
    photos: ChecklistPhoto[];
};

type Props = {
    checklist: ChecklistFormData;
};

type AnswerState = {
    checklist_item_id: number;
    first_value: string;
    second_value: string;
    observations: string;
};

type SignatureState = {
    signature_role_id: number;
    signer_name: string;
    signature_data_url: string | null;
    clear_signature: boolean;
    existing_url: string | null;
};

function toDateTimeLocal(date?: string | null, time?: string | null): string {
    if (!date) {
        return '';
    }

    const hhmm = time && time.length >= 5 ? time.slice(0, 5) : '00:00';

    return `${date}T${hhmm}`;
}

function splitDateTime(value: string): {
    date: string | null;
    time: string | null;
} {
    if (!value) {
        return { date: null, time: null };
    }

    const [date, time = ''] = value.split('T');

    return {
        date: date || null,
        time: time ? time.slice(0, 5) : null,
    };
}

function YesNoToggle({
    value,
    onChange,
    disabled,
}: {
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
}) {
    return (
        <div className="flex w-full gap-2">
            {(['yes', 'no'] as const).map((option) => {
                const active = value === option;

                return (
                    <button
                        key={option}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                            if (disabled) {
                                return;
                            }

                            onChange(active ? '' : option);
                        }}
                        className={cn(
                            'h-11 flex-1 rounded-lg border text-sm font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:h-10',
                            active && option === 'yes'
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : active && option === 'no'
                                  ? 'border-red-400 bg-red-50 text-red-700'
                                  : 'border-[#c5d5e6] bg-white text-[#5a7390]',
                        )}
                    >
                        {option === 'yes' ? 'SÍ' : 'NO'}
                    </button>
                );
            })}
        </div>
    );
}

function StepPill({
    label,
    active,
    done,
    locked,
}: {
    label: string;
    active: boolean;
    done: boolean;
    locked?: boolean;
}) {
    return (
        <div
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium',
                done
                    ? 'bg-[#e8f7ef] text-[#15803d]'
                    : active
                      ? 'bg-[#e8f1fa] text-[#2e5a9e]'
                      : 'bg-[#eef1f5] text-[#64748b]',
            )}
        >
            {done ? (
                <CheckCircle2 className="size-3.5" />
            ) : locked ? (
                <Lock className="size-3.5" />
            ) : null}
            {label}
        </div>
    );
}

export function ChecklistEditForm({ checklist }: Props) {
    const sealed = checklist.is_sealed;
    const firstLocked =
        sealed || checklist.first_result === 'approved';
    const secondUnlocked = checklist.first_result === 'approved';
    const secondLocked =
        sealed || checklist.second_result === 'approved';
    const signaturesUnlocked = checklist.second_result === 'approved';

    const [processing, setProcessing] = useState(false);
    const [location, setLocation] = useState(checklist.location ?? '');
    const [transportCompany, setTransportCompany] = useState(
        checklist.transport_company ?? '',
    );
    const [vehicleInfo, setVehicleInfo] = useState(checklist.vehicle_info ?? '');
    const [licenseNumber, setLicenseNumber] = useState(
        checklist.license_number ?? '',
    );
    const [licenseClass, setLicenseClass] = useState(
        checklist.license_class ?? '',
    );
    const [licenseRevalidation, setLicenseRevalidation] = useState(
        checklist.license_revalidation_on ?? '',
    );
    const [driverName, setDriverName] = useState(checklist.driver_name ?? '');
    const [firstAt, setFirstAt] = useState(
        toDateTimeLocal(
            checklist.first_inspected_on,
            checklist.first_inspected_time,
        ),
    );
    const [secondAt, setSecondAt] = useState(
        toDateTimeLocal(
            checklist.second_inspected_on,
            checklist.second_inspected_time,
        ),
    );
    const firstResult = checklist.first_result ?? '';
    const secondResult = checklist.second_result ?? '';
    const [observations, setObservations] = useState(
        checklist.additional_observations ?? '',
    );
    const [answers, setAnswers] = useState<AnswerState[]>(
        checklist.items.map((item) => ({
            checklist_item_id: item.id,
            first_value: item.first_value ?? '',
            second_value: item.second_value ?? '',
            observations: item.observations ?? '',
        })),
    );
    const [signatures, setSignatures] = useState<SignatureState[]>(
        checklist.signatures.map((signature) => ({
            signature_role_id: signature.signature_role_id,
            signer_name: signature.signer_name ?? '',
            signature_data_url: null,
            clear_signature: false,
            existing_url: signature.signature_url ?? null,
        })),
    );

    const firstStats = useMemo(() => {
        const marked = answers.filter((a) => a.first_value !== '').length;
        const yes = answers.filter((a) => a.first_value === 'yes').length;
        const no = answers.filter((a) => a.first_value === 'no').length;
        const missingExpiry = checklist.items.some((item, index) => {
            const isExpiry =
                item.check_type === 'expiry' || item.has_expiry;
            if (!isExpiry) {
                return false;
            }

            return (answers[index]?.observations ?? '').trim() === '';
        });

        return {
            total: answers.length,
            marked,
            yes,
            no,
            missingExpiry,
            allMarked: answers.length > 0 && marked === answers.length,
            allYes:
                answers.length > 0 &&
                yes === answers.length &&
                !missingExpiry,
        };
    }, [answers, checklist.items]);

    const secondStats = useMemo(() => {
        const marked = answers.filter((a) => a.second_value !== '').length;
        const yes = answers.filter((a) => a.second_value === 'yes').length;
        const no = answers.filter((a) => a.second_value === 'no').length;
        const missingExpiry = checklist.items.some((item, index) => {
            const isExpiry =
                item.check_type === 'expiry' || item.has_expiry;
            if (!isExpiry) {
                return false;
            }

            return (answers[index]?.observations ?? '').trim() === '';
        });

        return {
            total: answers.length,
            marked,
            yes,
            no,
            missingExpiry,
            allMarked: answers.length > 0 && marked === answers.length,
            allYes:
                answers.length > 0 &&
                yes === answers.length &&
                !missingExpiry,
        };
    }, [answers, checklist.items]);

    const activePass: 'first' | 'second' = secondUnlocked ? 'second' : 'first';
    const activeStats = activePass === 'first' ? firstStats : secondStats;

    const livePareto = useMemo(() => {
        const valueKey =
            activePass === 'first' ? 'first_value' : 'second_value';

        let scored = 0;
        let catalog = 0;

        checklist.items.forEach((item, index) => {
            const weight = Number(item.weight ?? 0);
            catalog += weight;

            if (answers[index]?.[valueKey] === 'yes') {
                scored += weight;
            }
        });

        return {
            scored: Math.round(scored * 100) / 100,
            catalog: Math.round(catalog * 100) / 100,
            allYes: activeStats.yes === activeStats.total && activeStats.total > 0,
        };
    }, [activePass, activeStats.total, activeStats.yes, answers, checklist.items]);

    const updateAnswer = (
        index: number,
        key: keyof AnswerState,
        value: string,
    ) => {
        setAnswers((prev) =>
            prev.map((answer, i) =>
                i === index ? { ...answer, [key]: value } : answer,
            ),
        );
    };

    const buildPayload = (extra: Record<string, unknown> = {}) => {
        const first = splitDateTime(firstAt);
        const second = splitDateTime(secondAt);

        return {
            location,
            transport_company: transportCompany,
            vehicle_info: vehicleInfo,
            license_number: licenseNumber,
            license_class: licenseClass,
            license_revalidation_on: licenseRevalidation || null,
            driver_name: driverName,
            first_inspected_on: first.date,
            first_inspected_time: first.time,
            second_inspected_on: second.date,
            second_inspected_time: second.time,
            first_result: firstResult || null,
            second_result: secondResult || null,
            additional_observations: observations || null,
            answers,
            signatures: signatures.map((signature) => ({
                signature_role_id: signature.signature_role_id,
                signer_name: signature.signer_name || null,
                signature_data_url: signature.signature_data_url,
                clear_signature: signature.clear_signature,
            })),
            ...extra,
        };
    };

    const save = (extra: Record<string, unknown> = {}) => {
        if (sealed || processing) {
            return;
        }

        setProcessing(true);
        router.put(`/inspecciones/${checklist.id}`, buildPayload(extra), {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
        });
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        save({ status: 'draft' });
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-5xl space-y-3 pb-24 sm:space-y-4 sm:pb-6"
        >
            <div className="rounded-2xl border border-[#d7e3f0] bg-white p-3 shadow-sm sm:p-5">
                <Link
                    href="/inspecciones"
                    className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[#2e5a9e] hover:underline"
                >
                    <ArrowLeft className="size-3.5" />
                    Volver
                </Link>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h1 className="font-display border-b-2 border-[#4a90e2] pb-1 text-xl font-semibold text-[#1a2b4c] sm:text-2xl">
                            Inspección {checklist.template.type.toUpperCase()}
                        </h1>
                        <p className="mt-2 text-sm text-[#5a7390]">
                            Placa{' '}
                            <strong className="text-[#1a2b4c]">
                                {checklist.plate_number}
                            </strong>{' '}
                            · {checklist.period?.name ?? 'Periodo'}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <StepPill
                            label="1ra"
                            active={!secondUnlocked}
                            done={checklist.first_result === 'approved'}
                        />
                        <StepPill
                            label="2da"
                            active={secondUnlocked && !signaturesUnlocked}
                            done={checklist.second_result === 'approved'}
                            locked={!secondUnlocked}
                        />
                        <StepPill
                            label="Firmas"
                            active={signaturesUnlocked && !sealed}
                            done={sealed}
                            locked={!signaturesUnlocked}
                        />
                    </div>
                </div>

                {sealed ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                            <p>
                                Inspección sellada
                                {checklist.sealed_at
                                    ? ` · ${new Date(checklist.sealed_at).toLocaleString('es-PE', {
                                          timeZone: 'America/Lima',
                                      })}`
                                    : ''}
                                . Ya no se puede editar.
                            </p>
                        </div>
                        <Button
                            type="button"
                            asChild
                            className="h-10 cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            <a
                                href={`/inspecciones/${checklist.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FileDown className="size-4" />
                                Descargar PDF
                            </a>
                        </Button>
                    </div>
                ) : !secondUnlocked ? (
                    <div className="mt-3 rounded-xl border border-[#d7e3f0] bg-[#f8fafc] px-3 py-2 text-xs text-[#5a7390]">
                        Empieza por la <strong>1ra inspección</strong>. Cuando
                        todos los ítems estén en SÍ (y con vencimiento donde
                        aplique), apruébala para habilitar la 2da.
                        <span className="mt-1 block font-medium text-[#1a2b4c]">
                            Progreso 1ra: {firstStats.marked}/{firstStats.total}{' '}
                            · {firstStats.yes} SÍ · {firstStats.no} NO
                            {firstStats.missingExpiry
                                ? ' · Faltan vencimientos'
                                : ''}
                        </span>
                    </div>
                ) : !signaturesUnlocked ? (
                    <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        1ra inspección aprobada. Completa la{' '}
                        <strong>2da inspección</strong>.
                        <span className="mt-1 block font-medium">
                            Progreso 2da: {secondStats.marked}/{secondStats.total}{' '}
                            · {secondStats.yes} SÍ · {secondStats.no} NO
                            {secondStats.missingExpiry
                                ? ' · Faltan vencimientos'
                                : ''}
                        </span>
                    </div>
                ) : (
                    <div className="mt-3 rounded-xl border border-[#d7e3f0] bg-[#e8f1fa] px-3 py-2 text-xs text-[#1a2b4c]">
                        1ra y 2da aprobadas. Puedes agregar{' '}
                        <strong>firmas opcionales</strong> y sellar la
                        inspección.
                    </div>
                )}
            </div>

            <div className="rounded-2xl border border-[#d7e3f0] bg-white p-3 shadow-sm sm:p-5">
                <h2 className="mb-3 text-sm font-semibold text-[#1a2b4c]">
                    Datos generales
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Placa" value={checklist.plate_number} disabled />
                    <Field
                        label="Conductor"
                        value={driverName}
                        onChange={setDriverName}
                        disabled={sealed}
                    />
                    <Field
                        label="Empresa de transporte"
                        value={transportCompany}
                        onChange={setTransportCompany}
                        disabled={sealed}
                    />
                    <Field
                        label="Lugar de inspección"
                        value={location}
                        onChange={setLocation}
                        disabled={sealed}
                    />
                    <Field
                        label="Marca / Modelo / Año"
                        value={vehicleInfo}
                        onChange={setVehicleInfo}
                        disabled={sealed}
                    />
                    <Field
                        label="N° de licencia"
                        value={licenseNumber}
                        onChange={setLicenseNumber}
                        disabled={sealed}
                    />
                    <Field
                        label="Clase / categoría"
                        value={licenseClass}
                        onChange={setLicenseClass}
                        disabled={sealed}
                    />
                    <Field
                        label="Fecha revalidación"
                        type="date"
                        value={licenseRevalidation}
                        onChange={setLicenseRevalidation}
                        disabled={sealed}
                    />
                    <Field
                        label="1ra inspección (fecha y hora)"
                        type="datetime-local"
                        value={firstAt}
                        onChange={setFirstAt}
                        disabled={sealed || firstLocked}
                    />
                    {secondUnlocked ? (
                        <Field
                            label="2da inspección (fecha y hora)"
                            type="datetime-local"
                            value={secondAt}
                            onChange={setSecondAt}
                            disabled={sealed || secondLocked}
                        />
                    ) : null}
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Resultado 1ra
                        </Label>
                        <ResultBadge value={firstResult || null} />
                    </div>
                    {secondUnlocked ? (
                        <div className="grid gap-1.5">
                            <Label className="text-xs text-[#1a2b4c]">
                                Resultado 2da
                            </Label>
                            <ResultBadge value={secondResult || null} />
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="rounded-2xl border border-[#d7e3f0] bg-white p-3 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-[#1a2b4c]">
                            Exigencias —{' '}
                            {activePass === 'first'
                                ? '1ra inspección'
                                : '2da inspección'}
                        </h2>
                        <p className="text-xs text-[#5a7390]">
                            {activePass === 'first'
                                ? 'Marca SÍ / NO de la primera inspección (catálogo Pareto).'
                                : '1ra bloqueada. Marca ahora la segunda inspección.'}
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-1 sm:items-end">
                        <span
                            className={cn(
                                'inline-flex w-fit rounded-full px-2.5 py-1 text-[11px] font-medium',
                                livePareto.scored >= 100
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : livePareto.scored > 0
                                      ? 'bg-sky-50 text-sky-800'
                                      : 'bg-slate-100 text-slate-700',
                            )}
                        >
                            Pareto {livePareto.scored.toFixed(2)}%
                            <span className="ml-1 font-normal opacity-80">
                                / {livePareto.catalog.toFixed(2)}%
                            </span>
                        </span>
                        <p className="text-[11px] text-[#6b8ead]">
                            Solo suman los ítems en SÍ · NO no puntúa
                        </p>
                    </div>
                </div>

                {!checklist.pareto?.weight_ok ? (
                    <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        Los pesos del catálogo Pareto no suman 100%. Ajusta en{' '}
                        <Link
                            href="/pareto"
                            className="font-semibold underline underline-offset-2"
                        >
                            Plataforma → Pareto
                        </Link>{' '}
                        antes de crear nuevas inspecciones.
                    </div>
                ) : null}

                <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
                    {checklist.items.map((item, index) => {
                        const answer = answers[index];
                        const isChild = item.parent_id !== null;
                        const isExpiry =
                            item.check_type === 'expiry' || item.has_expiry;
                        const value =
                            activePass === 'first'
                                ? (answer?.first_value ?? '')
                                : (answer?.second_value ?? '');
                        const disabled =
                            sealed ||
                            (activePass === 'first' ? firstLocked : secondLocked);
                        const observationMissing =
                            isExpiry &&
                            (answer?.observations ?? '').trim() === '';
                        const countsInPareto = value === 'yes';

                        return (
                            <article
                                key={item.id}
                                className={cn(
                                    'rounded-xl border border-[#e2eaf3] bg-white p-3',
                                    isChild &&
                                        'border-l-4 border-l-[#4a90e2] lg:ml-0',
                                    observationMissing &&
                                        !sealed &&
                                        'border-amber-300',
                                    value === 'no' && 'opacity-80',
                                )}
                            >
                                <div className="mb-2.5 flex items-start gap-2">
                                    <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-[#1a2b4c] text-xs font-semibold text-white">
                                        {item.item_number}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={cn(
                                                'pt-0.5 text-sm leading-snug text-[#1a2b4c]',
                                                isChild && 'text-[#5a7390]',
                                            )}
                                        >
                                            {item.label}
                                        </p>
                                        {item.weight != null ? (
                                            <p
                                                className={cn(
                                                    'mt-0.5 text-[11px]',
                                                    countsInPareto
                                                        ? 'font-medium text-emerald-700'
                                                        : value === 'no'
                                                          ? 'text-red-500 line-through'
                                                          : 'text-[#6b8ead]',
                                                )}
                                            >
                                                Peso{' '}
                                                {Number(item.weight).toFixed(2)}%
                                                {value === 'no'
                                                    ? ' (no suma)'
                                                    : countsInPareto
                                                      ? ' (suma)'
                                                      : ''}
                                            </p>
                                        ) : null}
                                    </div>
                                </div>
                                <YesNoToggle
                                    value={value}
                                    disabled={disabled}
                                    onChange={(next) =>
                                        updateAnswer(
                                            index,
                                            activePass === 'first'
                                                ? 'first_value'
                                                : 'second_value',
                                            next,
                                        )
                                    }
                                />
                                <Input
                                    value={answer?.observations ?? ''}
                                    disabled={sealed}
                                    onChange={(event) =>
                                        updateAnswer(
                                            index,
                                            'observations',
                                            event.target.value,
                                        )
                                    }
                                    placeholder={
                                        isExpiry
                                            ? 'Vencimiento / observación'
                                            : 'Observación'
                                    }
                                    className={cn(
                                        'mt-2 h-9 border-[#c5d5e6] text-sm disabled:bg-[#f8fafc]',
                                        observationMissing &&
                                            !sealed &&
                                            'border-amber-400',
                                    )}
                                />
                            </article>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-2xl border border-[#d7e3f0] bg-white p-3 shadow-sm sm:p-5">
                <h2 className="mb-2 text-sm font-semibold text-[#1a2b4c]">
                    Observaciones adicionales
                </h2>
                {checklist.template.notes_hint ? (
                    <p className="mb-2 text-xs text-[#5a7390]">
                        {checklist.template.notes_hint}
                    </p>
                ) : null}
                <Textarea
                    value={observations}
                    disabled={sealed}
                    onChange={(event) => setObservations(event.target.value)}
                    rows={3}
                    className="border-[#c5d5e6] text-sm disabled:bg-[#f8fafc]"
                />
            </div>

            <ChecklistPhotosSection
                checklistId={checklist.id}
                photos={checklist.photos ?? []}
                showFirst
                showSecond={secondUnlocked}
                readonlyFirst={sealed || firstLocked}
                readonlySecond={sealed || secondLocked}
            />

            {signaturesUnlocked ? (
                <div className="rounded-2xl border border-[#d7e3f0] bg-white p-3 shadow-sm sm:p-5">
                    <h2 className="mb-1 text-sm font-semibold text-[#1a2b4c]">
                        Firmas virtuales
                    </h2>
                    <p className="mb-3 text-xs text-[#5a7390]">
                        Opcional: agrega nombre y firma de quien esté presente.
                        Al sellar quedan bloqueadas.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2">
                        {checklist.signatures.map((signature, index) => {
                            const state = signatures[index];

                            return (
                                <div
                                    key={signature.signature_role_id}
                                    className="rounded-xl border border-[#e2eaf3] bg-[#f8fafc] p-3"
                                >
                                    <Label className="text-xs font-semibold text-[#1a2b4c]">
                                        {signature.label}
                                    </Label>
                                    <Input
                                        value={state?.signer_name ?? ''}
                                        disabled={sealed}
                                        onChange={(event) => {
                                            const value = event.target.value;
                                            setSignatures((prev) =>
                                                prev.map((item, i) =>
                                                    i === index
                                                        ? {
                                                              ...item,
                                                              signer_name: value,
                                                          }
                                                        : item,
                                                ),
                                            );
                                        }}
                                        placeholder="Nombre completo"
                                        className="mt-2 h-10 border-[#c5d5e6] bg-white"
                                    />
                                    <div className="mt-2">
                                        <SignaturePad
                                            disabled={sealed}
                                            valueUrl={
                                                state?.clear_signature
                                                    ? null
                                                    : (state?.signature_data_url ??
                                                      state?.existing_url)
                                            }
                                            onChange={(dataUrl) => {
                                                setSignatures((prev) =>
                                                    prev.map((item, i) =>
                                                        i === index
                                                            ? {
                                                                  ...item,
                                                                  signature_data_url:
                                                                      dataUrl,
                                                                  clear_signature:
                                                                      dataUrl ===
                                                                      null,
                                                                  existing_url:
                                                                      dataUrl ===
                                                                      null
                                                                          ? null
                                                                          : item.existing_url,
                                                              }
                                                            : item,
                                                    ),
                                                );
                                            }}
                                        />
                                    </div>
                                    {signature.signed_at ? (
                                        <p className="mt-1 text-[11px] text-[#6b8ead]">
                                            Firmado: {signature.signed_at}
                                        </p>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}

            {!sealed ? (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d7e3f0] bg-white/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                    <div className="mx-auto flex max-w-5xl flex-col gap-2">
                        <p className="text-center text-[11px] text-[#5a7390] sm:text-right">
                            {!firstLocked && !firstStats.allYes
                                ? firstStats.missingExpiry
                                    ? 'Completa los vencimientos / observaciones para poder aprobar la 1ra.'
                                    : firstStats.no > 0
                                      ? 'Hay ítems en NO: puedes guardar borrador o desaprobar la 1ra.'
                                      : 'Marca todos los ítems en SÍ para habilitar «Aprobar 1ra».'
                                : secondUnlocked &&
                                    !secondLocked &&
                                    !secondStats.allYes
                                  ? secondStats.missingExpiry
                                      ? 'Completa los vencimientos / observaciones para aprobar la 2da.'
                                      : 'Marca todos los ítems en SÍ para habilitar «Aprobar 2da».'
                                  : signaturesUnlocked
                                    ? 'Puedes firmar (opcional) y sellar la inspección.'
                                    : 'Puedes guardar el progreso en cualquier momento.'}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={() => save({ status: 'draft' })}
                                className="h-11 cursor-pointer border-[#c5d5e6] text-[#1a2b4c] sm:h-10"
                            >
                                {processing ? <Spinner /> : null}
                                Guardar borrador
                            </Button>

                            {!firstLocked ? (
                                <Button
                                    type="button"
                                    disabled={processing || !firstStats.allYes}
                                    onClick={() =>
                                        save({
                                            status: 'draft',
                                            first_result: 'approved',
                                        })
                                    }
                                    className="h-11 cursor-pointer bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10"
                                >
                                    Aprobar 1ra inspección
                                </Button>
                            ) : null}

                            {!firstLocked && firstStats.no > 0 ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={processing}
                                    onClick={() =>
                                        save({
                                            status: 'draft',
                                            first_result: 'rejected',
                                        })
                                    }
                                    className="h-11 cursor-pointer border-red-200 text-red-700 sm:h-10"
                                >
                                    Desaprobar 1ra
                                </Button>
                            ) : null}

                            {secondUnlocked && !secondLocked ? (
                                <Button
                                    type="button"
                                    disabled={processing || !secondStats.allYes}
                                    onClick={() =>
                                        save({
                                            status: 'draft',
                                            second_result: 'approved',
                                        })
                                    }
                                    className="h-11 cursor-pointer bg-emerald-700 text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10"
                                >
                                    Aprobar 2da inspección
                                </Button>
                            ) : null}

                            {signaturesUnlocked ? (
                                <Button
                                    type="button"
                                    disabled={processing}
                                    onClick={() =>
                                        save({
                                            status: 'completed',
                                            seal: true,
                                        })
                                    }
                                    className="h-11 cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:opacity-50 sm:h-10"
                                >
                                    <ShieldCheck className="size-4" />
                                    Sellar inspección
                                </Button>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </form>
    );
}

function Field({
    label,
    value,
    onChange,
    type = 'text',
    disabled = false,
}: {
    label: string;
    value: string;
    onChange?: (value: string) => void;
    type?: string;
    disabled?: boolean;
}) {
    return (
        <div className="grid gap-1.5">
            <Label className="text-xs text-[#1a2b4c]">{label}</Label>
            <Input
                type={type}
                value={value}
                disabled={disabled}
                onChange={(event) => onChange?.(event.target.value)}
                className="h-10 border-[#c5d5e6] disabled:bg-[#f8fafc]"
            />
        </div>
    );
}

function ResultBadge({ value }: { value?: string | null }) {
    const label =
        value === 'approved'
            ? 'Aprobado'
            : value === 'rejected'
              ? 'Desaprobado'
              : 'Pendiente';

    return (
        <div
            className={cn(
                'flex h-10 items-center rounded-lg border px-3 text-sm font-medium',
                value === 'approved'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : value === 'rejected'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-[#c5d5e6] bg-[#f8fafc] text-[#5a7390]',
            )}
        >
            {label}
        </div>
    );
}
