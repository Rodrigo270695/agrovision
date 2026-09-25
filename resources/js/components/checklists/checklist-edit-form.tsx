import { Link, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Camera,
    CheckCircle2,
    FileDown,
    Lock,
    ShieldCheck,
    Trash2,
} from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
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
import { getCsrfToken } from '@/lib/csrf';
import { isBrowserOnline, isLocalChecklistId } from '@/lib/offline/ids';
import { applyUpdateToChecklist, queueUpdate, saveEditSnapshot } from '@/lib/offline/store';
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
    slot: 'driver' | 'sst' | 'inspector';
    inspection_pass: 'first' | 'second';
    label: string;
    signer_name: string | null;
    signature_url?: string | null;
    signed_at?: string | null;
};

export type ChecklistFormData = {
    id: number | string;
    status: 'draft' | 'completed';
    is_sealed: boolean;
    sealed_at: string | null;
    plate_number: string;
    driver_name: string | null;
    driver_options?: { date: string; name: string }[];
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
    coordinator_status?: 'observed' | 'reviewed' | null;
    sent_to_coordinator_at?: string | null;
    coordinator_action_plan?: string | null;
    can_send_to_coordinator?: boolean;
    can_start_second?: boolean;
    inspection_batch?: {
        id: number;
        inspected_on: string;
        status: 'sent' | 'signed';
        signer_name?: string | null;
        signed_at?: string | null;
    } | null;
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

const TDP_EVIDENCE_ITEMS = new Set(['13', '14', '19', '21', '26', '30']);

function toDateInputValue(value: string): string {
    const trimmed = value.trim();

    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        return trimmed.slice(0, 10);
    }

    const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

    if (match) {
        return `${match[3]}-${match[2]}-${match[1]}`;
    }

    return '';
}

function itemAllowsEvidence(
    templateType: string,
    itemNumber: string | null,
): boolean {
    return (
        templateType === 'tdp' &&
        itemNumber !== null &&
        TDP_EVIDENCE_ITEMS.has(itemNumber)
    );
}

async function compressEvidence(file: File): Promise<File> {
    const url = URL.createObjectURL(file);

    try {
        const image = await new Promise<HTMLImageElement>((resolve, reject) => {
            const element = new Image();
            element.onload = () => resolve(element);
            element.onerror = () => reject(new Error('decode'));
            element.src = url;
        });
        const maxSide = 1280;
        const scale = Math.min(
            1,
            maxSide / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return file;
        }

        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.82);
        });

        if (!blob) {
            return file;
        }

        return new File([blob], `evidencia-${Date.now()}.jpg`, {
            type: 'image/jpeg',
        });
    } catch {
        return file;
    } finally {
        URL.revokeObjectURL(url);
    }
}

type Props = {
    checklist: ChecklistFormData;
    onBack?: () => void;
};

type AnswerState = {
    checklist_item_id: number;
    first_value: string;
    second_value: string;
    observations: string;
};

type SignatureState = {
    signature_role_id: number;
    slot: 'driver' | 'sst' | 'inspector';
    inspection_pass: 'first' | 'second';
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
        <div
            role="group"
            aria-label="Resultado del ítem"
            className="inline-flex h-9 shrink-0 rounded-lg border border-[#d5e1ee] bg-[#f4f7fb] p-0.5 sm:h-8"
        >
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
                            'min-w-11 rounded-md px-2.5 text-[12px] font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
                            active && option === 'yes'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : active && option === 'no'
                                  ? 'bg-red-600 text-white shadow-sm'
                                  : 'text-[#5a7390]',
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

export function ChecklistEditForm({ checklist, onBack }: Props) {
    const sealed = checklist.is_sealed;
    const firstLocked =
        sealed ||
        checklist.first_result === 'approved' ||
        checklist.first_result === 'rejected';
    const secondUnlocked = Boolean(checklist.can_start_second);
    const waitingCoordinator =
        firstLocked && !secondUnlocked && !sealed;
    const secondLocked =
        sealed || checklist.second_result === 'approved';
    const canSeal =
        checklist.first_result === 'approved' &&
        checklist.second_result === 'approved';

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
    const inspectionDate = firstAt.slice(0, 10);
    const driversForDate = useMemo(() => {
        const names = (checklist.driver_options ?? [])
            .filter((option) => option.date === inspectionDate)
            .map((option) => option.name);

        if (
            driverName !== '' &&
            !names.some((name) => name.toLowerCase() === driverName.toLowerCase())
        ) {
            return [driverName, ...names];
        }

        return [...new Set(names)];
    }, [checklist.driver_options, inspectionDate, driverName]);
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
    const [evidencePhotos, setEvidencePhotos] = useState<ChecklistPhoto[]>(
        checklist.photos ?? [],
    );
    const [evidenceBusy, setEvidenceBusy] = useState<number | null>(null);
    const evidenceInputRef = useRef<HTMLInputElement>(null);
    const evidenceTargetRef = useRef<number | null>(null);
    const [signatures, setSignatures] = useState<SignatureState[]>(
        checklist.signatures.map((signature) => ({
            signature_role_id: signature.signature_role_id,
            slot: signature.slot,
            inspection_pass: signature.inspection_pass,
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

            return (
                toDateInputValue(answers[index]?.observations ?? '') === ''
            );
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

            return (
                toDateInputValue(answers[index]?.observations ?? '') === ''
            );
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

    const PARETO_PASS_THRESHOLD = 85;

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

        const scoredRounded = Math.round(scored * 100) / 100;
        const catalogRounded = Math.round(catalog * 100) / 100;
        const percent =
            catalogRounded > 0
                ? Math.round((scoredRounded / catalogRounded) * 10000) / 100
                : 0;

        return {
            scored: scoredRounded,
            catalog: catalogRounded,
            percent,
            passes: percent >= PARETO_PASS_THRESHOLD,
            allYes: activeStats.yes === activeStats.total && activeStats.total > 0,
        };
    }, [activePass, activeStats.total, activeStats.yes, answers, checklist.items]);

    const canApproveActivePass =
        activeStats.allMarked &&
        !activeStats.missingExpiry &&
        livePareto.passes;

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

    const uploadEvidence = async (itemId: number, file: File) => {
        if (sealed || evidenceBusy) {
            return;
        }

        if (!isBrowserOnline() || isLocalChecklistId(checklist.id)) {
            toast.error('Conéctate para subir la foto de evidencia.');

            return;
        }

        setEvidenceBusy(itemId);

        try {
            const prepared = await compressEvidence(file);
            const formData = new FormData();
            formData.append('inspection_pass', activePass);
            formData.append('checklist_item_id', String(itemId));
            formData.append('photo', prepared);

            const response = await fetch(`/inspecciones/${checklist.id}/fotos`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: formData,
            });
            const data = (await response.json().catch(() => null)) as {
                message?: string;
                photo?: ChecklistPhoto;
            } | null;

            if (!response.ok || !data?.photo) {
                toast.error(data?.message || 'No se pudo subir la foto.');

                return;
            }

            setEvidencePhotos((prev) => [
                ...prev.filter(
                    (photo) =>
                        !(
                            photo.checklist_item_id === itemId &&
                            photo.inspection_pass === activePass
                        ),
                ),
                {
                    ...data.photo,
                    checklist_item_id: itemId,
                    inspection_pass: activePass,
                    captured_at: data.photo.captured_at ?? null,
                    latitude: data.photo.latitude ?? null,
                    longitude: data.photo.longitude ?? null,
                    accuracy: data.photo.accuracy ?? null,
                },
            ]);
            toast.success('Foto de evidencia subida.');
        } catch {
            toast.error('No se pudo subir la foto.');
        } finally {
            setEvidenceBusy(null);
        }
    };

    const removeEvidence = async (photo: ChecklistPhoto) => {
        if (sealed || evidenceBusy || typeof photo.id !== 'number') {
            return;
        }

        setEvidenceBusy(photo.checklist_item_id ?? -1);

        try {
            const response = await fetch(
                `/inspecciones/${checklist.id}/fotos/${photo.id}`,
                {
                    method: 'DELETE',
                    credentials: 'same-origin',
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-XSRF-TOKEN': getCsrfToken(),
                    },
                },
            );

            if (!response.ok) {
                toast.error('No se pudo quitar la foto.');

                return;
            }

            setEvidencePhotos((prev) =>
                prev.filter((item) => item.id !== photo.id),
            );
        } catch {
            toast.error('No se pudo quitar la foto.');
        } finally {
            setEvidenceBusy(null);
        }
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
                slot: signature.slot,
                inspection_pass: signature.inspection_pass,
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

        if (extra.seal && (!isBrowserOnline() || isLocalChecklistId(checklist.id))) {
            toast.error('Necesitas conexión para sellar la inspección.');

            return;
        }

        const payload = buildPayload(extra);

        if (!isBrowserOnline() || isLocalChecklistId(checklist.id)) {
            setProcessing(true);
            void (async () => {
                try {
                    await queueUpdate(checklist.id, payload);
                    await saveEditSnapshot(applyUpdateToChecklist(checklist, payload));
                    toast.success(
                        'Guardado en el dispositivo. Se enviará al reconectar.',
                    );
                } catch {
                    toast.error('No se pudo guardar en el dispositivo.');
                } finally {
                    setProcessing(false);
                }
            })();

            return;
        }

        setProcessing(true);
        router.put(`/inspecciones/${checklist.id}`, payload, {
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
                    onClick={(event) => {
                        if (!onBack) {
                            return;
                        }

                        event.preventDefault();
                        onBack();
                    }}
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
                            done={
                                checklist.first_result === 'approved' ||
                                checklist.first_result === 'rejected'
                            }
                        />
                        <StepPill
                            label="2da"
                            active={secondUnlocked && !secondLocked && !sealed}
                            done={
                                checklist.second_result === 'approved' ||
                                checklist.second_result === 'rejected'
                            }
                            locked={!secondUnlocked}
                        />
                        <StepPill
                            label="Firmas"
                            active={!sealed}
                            done={sealed}
                        />
                    </div>
                </div>

                {checklist.inspection_batch ? (
                    <div
                        className={
                            checklist.inspection_batch.status === 'signed'
                                ? 'mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900'
                                : 'mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900'
                        }
                    >
                        {checklist.inspection_batch.status === 'signed' ? (
                            <>
                                Firma masiva del coordinador
                                {checklist.inspection_batch.signer_name
                                    ? ` (${checklist.inspection_batch.signer_name})`
                                    : ''}{' '}
                                aplicada al paquete del{' '}
                                {checklist.inspection_batch.inspected_on
                                    .slice(0, 10)
                                    .split('-')
                                    .reverse()
                                    .join('/')}
                                .
                            </>
                        ) : (
                            <>
                                Esta inspección está en el paquete del{' '}
                                {checklist.inspection_batch.inspected_on
                                    .slice(0, 10)
                                    .split('-')
                                    .reverse()
                                    .join('/')}
                                . El
                                coordinador firma una sola vez y cubre todas las
                                del día.
                            </>
                        )}{' '}
                        <a
                            href={`/paquetes-inspeccion/${checklist.inspection_batch.id}`}
                            className="font-semibold underline"
                        >
                            Ver paquete
                        </a>
                    </div>
                ) : null}

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
                                Ver PDF
                            </a>
                        </Button>
                    </div>
                ) : waitingCoordinator ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                            La 1ra quedó cerrada. La 2da es de la misma fecha.
                            Al terminar las del día, envía el paquete al
                            coordinador desde Inspecciones.
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="h-10 shrink-0 cursor-pointer border-emerald-200 text-emerald-800"
                        >
                            <a
                                href={`/inspecciones/${checklist.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FileDown className="size-4" />
                                Ver consolidado PDF
                            </a>
                        </Button>
                    </div>
                ) : secondUnlocked ? (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                            {canSeal
                                ? '1ra y 2da cerradas. Cada una lleva la firma del conductor y el V°B° SST.'
                                : (
                                      <>
                                          La 1ra quedó cerrada. Sigue con la{' '}
                                          <strong>2da inspección</strong> de la
                                          misma fecha. Al terminar el día, envía
                                          el paquete al coordinador.
                                          <span className="mt-1 block font-medium">
                                              Progreso 2da:{' '}
                                              {secondStats.marked}/
                                              {secondStats.total} ·{' '}
                                              {secondStats.yes} SÍ ·{' '}
                                              {secondStats.no} NO
                                              {secondStats.missingExpiry
                                                  ? ' · Faltan vencimientos'
                                                  : ''}
                                          </span>
                                      </>
                                  )}
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="h-10 shrink-0 cursor-pointer border-emerald-200 text-emerald-800"
                        >
                            <a
                                href={`/inspecciones/${checklist.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <FileDown className="size-4" />
                                Ver consolidado PDF
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
                ) : null}
            </div>

            <div className="rounded-2xl border border-[#d7e3f0] bg-white p-3 shadow-sm sm:p-5">
                <h2 className="mb-3 text-sm font-semibold text-[#1a2b4c]">
                    Datos generales
                </h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Placa" value={checklist.plate_number} disabled />
                    {driversForDate.length > 0 ? (
                        <div className="grid gap-1.5">
                            <Label className="text-xs text-[#1a2b4c]">
                                Conductor
                            </Label>
                            <select
                                value={driverName}
                                disabled={sealed}
                                onChange={(event) =>
                                    setDriverName(event.target.value)
                                }
                                className="h-10 rounded-md border border-[#c5d5e6] bg-white px-3 text-sm text-[#1a2b4c] disabled:bg-[#f8fafc]"
                            >
                                <option value="">Selecciona conductor</option>
                                {driversForDate.map((name) => (
                                    <option key={name} value={name}>
                                        {name}
                                    </option>
                                ))}
                            </select>
                            {driversForDate.length > 1 ? (
                                <p className="text-[11px] text-[#6b8ead]">
                                    Conductores de esta placa en la fecha de la
                                    1ra inspección.
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <Field
                            label="Conductor"
                            value={driverName}
                            onChange={setDriverName}
                            disabled={sealed}
                        />
                    )}
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
                        label="Fecha de la inspección (arma el paquete)"
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
                                livePareto.passes
                                    ? 'bg-emerald-50 text-emerald-800'
                                    : livePareto.percent > 0
                                      ? 'bg-amber-50 text-amber-900'
                                      : 'bg-slate-100 text-slate-700',
                            )}
                        >
                            Pareto {livePareto.percent.toFixed(2)}%
                            <span className="ml-1 font-normal opacity-80">
                                / {livePareto.catalog.toFixed(2)}%
                            </span>
                        </span>
                        <p className="text-[11px] text-[#6b8ead]">
                            Umbral {PARETO_PASS_THRESHOLD}% · Solo suman los SÍ
                            {!livePareto.passes ? (
                                <span className="ml-1 font-medium text-red-700">
                                    · Desaprobado (&lt; {PARETO_PASS_THRESHOLD}%)
                                </span>
                            ) : null}
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

                <input
                    ref={evidenceInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    form="checklist-item-evidence"
                    className="hidden"
                    onChange={(event) => {
                        const file = event.target.files?.[0];
                        const itemId = evidenceTargetRef.current;
                        event.target.value = '';

                        if (!file || itemId === null) {
                            return;
                        }

                        void uploadEvidence(itemId, file);
                    }}
                />
                <div className="grid grid-cols-1 gap-1.5 xl:grid-cols-2">
                    {checklist.items.map((item, index) => {
                        const answer = answers[index];
                        const isChild = item.parent_id !== null;
                        const isExpiry =
                            item.check_type === 'expiry' || item.has_expiry;
                        const expiryDate = toDateInputValue(
                            answer?.observations ?? '',
                        );
                        const allowsEvidence = itemAllowsEvidence(
                            checklist.template.type,
                            item.item_number,
                        );
                        const evidencePhoto = allowsEvidence
                            ? (evidencePhotos.find(
                                  (photo) =>
                                      photo.checklist_item_id === item.id &&
                                      photo.inspection_pass === activePass,
                              ) ?? null)
                            : null;
                        const value =
                            activePass === 'first'
                                ? (answer?.first_value ?? '')
                                : (answer?.second_value ?? '');
                        const disabled =
                            sealed ||
                            (activePass === 'first' ? firstLocked : secondLocked);
                        const observationMissing = isExpiry && expiryDate === '';
                        const countsInPareto = value === 'yes';

                        return (
                            <article
                                key={item.id}
                                className={cn(
                                    'rounded-xl border border-[#e2eaf3] bg-white px-2.5 py-2 sm:px-3',
                                    isChild && 'bg-[#f7fafc]',
                                    value === 'yes' &&
                                        'border-emerald-200 bg-emerald-50/50',
                                    value === 'no' &&
                                        'border-red-200 bg-red-50/40',
                                    observationMissing &&
                                        !sealed &&
                                        'border-amber-300',
                                )}
                            >
                                <div className="flex items-start gap-2">
                                    <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[#1a2b4c] text-[11px] font-semibold text-white">
                                        {item.item_number}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <p
                                                className={cn(
                                                    'pt-0.5 text-[13px] leading-snug text-[#1a2b4c]',
                                                    isChild && 'text-[#3d5674]',
                                                )}
                                            >
                                                {item.label}
                                            </p>
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
                                        </div>
                                        <div className="mt-1.5 flex items-center gap-1.5">
                                            {item.weight != null ? (
                                                <span
                                                    className={cn(
                                                        'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums',
                                                        countsInPareto
                                                            ? 'bg-emerald-100 text-emerald-800'
                                                            : value === 'no'
                                                              ? 'bg-red-100 text-red-700 line-through'
                                                              : 'bg-[#eef3f8] text-[#6b8ead]',
                                                    )}
                                                >
                                                    {Number(item.weight).toFixed(2)}%
                                                </span>
                                            ) : null}
                                            {isExpiry ? (
                                                <Input
                                                    type="date"
                                                    value={expiryDate}
                                                    disabled={sealed}
                                                    onChange={(event) =>
                                                        updateAnswer(
                                                            index,
                                                            'observations',
                                                            event.target.value,
                                                        )
                                                    }
                                                    aria-label={`Vencimiento de ${item.label}`}
                                                    className={cn(
                                                        'h-8 min-w-0 flex-1 border-[#c5d5e6] bg-white text-xs disabled:bg-[#f8fafc]',
                                                        observationMissing &&
                                                            !sealed &&
                                                            'border-amber-400',
                                                    )}
                                                />
                                            ) : (
                                                <Input
                                                    value={
                                                        answer?.observations ??
                                                        ''
                                                    }
                                                    disabled={sealed}
                                                    onChange={(event) =>
                                                        updateAnswer(
                                                            index,
                                                            'observations',
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Observación"
                                                    className="h-8 min-w-0 flex-1 border-[#c5d5e6] bg-white text-xs disabled:bg-[#f8fafc]"
                                                />
                                            )}
                                        </div>
                                        {allowsEvidence ? (
                                            <div className="mt-1.5 flex items-center gap-2">
                                                {evidencePhoto ? (
                                                    <a
                                                        href={evidencePhoto.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="block shrink-0 overflow-hidden rounded-md border border-[#d7e3f0]"
                                                    >
                                                        <img
                                                            src={
                                                                evidencePhoto.url
                                                            }
                                                            alt={`Evidencia ${item.label}`}
                                                            className="size-12 object-cover"
                                                        />
                                                    </a>
                                                ) : (
                                                    <span className="text-[10px] text-[#6b8ead]">
                                                        Sin foto
                                                    </span>
                                                )}
                                                {!disabled ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        disabled={
                                                            evidenceBusy ===
                                                            item.id
                                                        }
                                                        onClick={() => {
                                                            evidenceTargetRef.current =
                                                                item.id;
                                                            evidenceInputRef.current?.click();
                                                        }}
                                                        className="h-8 cursor-pointer gap-1 border-[#c5d5e6] px-2 text-[11px] text-[#1a2b4c]"
                                                    >
                                                        {evidenceBusy ===
                                                        item.id ? (
                                                            <Spinner />
                                                        ) : (
                                                            <Camera className="size-3.5" />
                                                        )}
                                                        {evidencePhoto
                                                            ? 'Cambiar foto'
                                                            : 'Subir foto'}
                                                    </Button>
                                                ) : null}
                                                {evidencePhoto && !disabled ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        disabled={
                                                            evidenceBusy ===
                                                            item.id
                                                        }
                                                        onClick={() =>
                                                            void removeEvidence(
                                                                evidencePhoto,
                                                            )
                                                        }
                                                        className="size-8 cursor-pointer text-red-600 hover:bg-red-50 hover:text-red-700"
                                                        aria-label="Quitar foto de evidencia"
                                                    >
                                                        <Trash2 className="size-3.5" />
                                                    </Button>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
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

            <div className="rounded-2xl border border-[#d7e3f0] bg-white p-3 shadow-sm sm:p-5">
                <h2 className="mb-1 text-sm font-semibold text-[#1a2b4c]">
                    Firmas
                </h2>
                <p className="mb-3 text-xs text-[#5a7390]">
                    La 1ra y la 2da firman por separado. Cada una lleva la
                    firma del conductor y el V°B° SST.
                </p>
                {(['first', 'second'] as const).map((pass) => {
                    const passLocked =
                        sealed || (pass === 'second' && !secondUnlocked);
                    const cards = checklist.signatures
                        .map((signature, index) => ({ signature, index }))
                        .filter(
                            ({ signature }) =>
                                signature.inspection_pass === pass,
                        );

                    if (cards.length === 0) {
                        return null;
                    }

                    return (
                        <div key={pass} className="mt-4">
                            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#1a2b4c]">
                                {pass === 'first'
                                    ? 'Firmas de la 1ra'
                                    : 'Firmas de la 2da'}
                            </h3>
                            {pass === 'second' && !secondUnlocked ? (
                                <p className="mb-2 text-xs text-[#8a5a12]">
                                    Se habilitan al cerrar la 1ra. No hace
                                    falta que la 2da esté aprobada para
                                    enviar el paquete.
                                </p>
                            ) : null}
                            <div className="grid gap-4 sm:grid-cols-2">
                                {cards
                                    .filter(
                                        ({ signature }) =>
                                            signature.slot !== 'inspector',
                                    )
                                    .map(({ signature, index }) => {
                                    const state = signatures[index];

                                    return (
                                        <div
                                            key={`${signature.inspection_pass}-${signature.slot}`}
                                            className="rounded-xl border border-[#e2eaf3] bg-[#f8fafc] p-3"
                                        >
                                            <Label className="text-xs font-semibold text-[#1a2b4c]">
                                                {signature.label}
                                            </Label>
                                            <Input
                                                value={state?.signer_name ?? ''}
                                                disabled={passLocked}
                                                onChange={(event) => {
                                                    const value =
                                                        event.target.value;
                                                    setSignatures((prev) =>
                                                        prev.map((item, i) =>
                                                            i === index
                                                                ? {
                                                                      ...item,
                                                                      signer_name:
                                                                          value,
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
                                                    disabled={passLocked}
                                                    valueUrl={
                                                        state?.clear_signature
                                                            ? null
                                                            : (state?.signature_data_url ??
                                                              state?.existing_url)
                                                    }
                                                    onChange={(dataUrl) => {
                                                        setSignatures((prev) =>
                                                            prev.map(
                                                                (item, i) =>
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
                                                    Firmado:{' '}
                                                    {signature.signed_at}
                                                </p>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {!sealed ? (
                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#d7e3f0] bg-white/95 p-3 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                    <div className="mx-auto flex max-w-5xl flex-col gap-2">
                        <p className="text-center text-[11px] text-[#5a7390] sm:text-right">
                            {waitingCoordinator
                                ? 'Cierra la 1ra para habilitar la 2da de esta misma fecha.'
                                  : !firstLocked && !livePareto.passes
                                    ? `Pareto ${livePareto.percent.toFixed(2)}% (< ${PARETO_PASS_THRESHOLD}%): desaprueba o corrige ítems en NO.`
                                    : !firstLocked && !canApproveActivePass
                                      ? firstStats.missingExpiry
                                          ? 'Completa los vencimientos / observaciones para poder aprobar la 1ra.'
                                          : !firstStats.allMarked
                                            ? 'Marca todos los ítems en SÍ/NO para poder aprobar o desaprobar.'
                                            : `Necesitas ≥ ${PARETO_PASS_THRESHOLD}% Pareto para aprobar la 1ra.`
                                      : secondUnlocked &&
                                          !secondLocked &&
                                          !canApproveActivePass
                                        ? secondStats.missingExpiry
                                            ? 'Completa los vencimientos / observaciones para aprobar la 2da.'
                                            : !secondStats.allMarked
                                              ? 'Marca todos los ítems en SÍ/NO para aprobar la 2da.'
                                              : `Necesitas ≥ ${PARETO_PASS_THRESHOLD}% Pareto para aprobar la 2da.`
                                        : 'Las firmas de la 1ra y de la 2da son independientes: conductor y V°B° SST. Puedes guardar en cualquier momento.'}
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
                                    disabled={processing || !canApproveActivePass}
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

                            {!firstLocked &&
                            (firstStats.no > 0 || !livePareto.passes) ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={processing || !firstStats.allMarked}
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
                                    disabled={processing || !canApproveActivePass}
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

                            {canSeal ? (
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
