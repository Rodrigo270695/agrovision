import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Copy,
    Download,
    FileText,
    PenLine,
    UserMinus,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { SignaturePad } from '@/components/checklists/signature-pad';
import { FingerprintCameraCapture } from '@/components/inductions/fingerprint-camera-capture';
import { InductionFormModal } from '@/components/inductions/induction-form-modal';
import type {
    InductionFormOptions,
    PeriodOption,
} from '@/components/inductions/induction-form-fields';
import type { InductionItem } from '@/components/inductions/inductions-table';
import { InductionMailPanels } from '@/components/inductions/induction-mail-panels';
import { VerificationPhotoCapture } from '@/components/inductions/verification-photo-capture';
import { AppModal } from '@/components/shared/app-modal';
import { TableSearchFilter } from '@/components/shared/table-search-filter';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useCan } from '@/hooks/use-can';
import { isBrowserOnline } from '@/lib/offline/ids';
import { openInductionPdf } from '@/lib/open-induction-pdf';
import { saveInductionSnapshot } from '@/lib/offline/store';
import { visitOrQueue } from '@/lib/offline/visit-or-queue';
import { cn } from '@/lib/utils';

type Attendee = {
    id: number;
    unit_id?: number | null;
    driver_name: string;
    driver_dni?: string | null;
    plate_number?: string | null;
    correlative?: string | null;
    status: string;
    signature_url?: string | null;
    fingerprint_url?: string | null;
    is_signed?: boolean;
    has_fingerprint?: boolean;
    saved_signature_url?: string | null;
    saved_fingerprint_url?: string | null;
};

type UnitOption = {
    id: number;
    correlative: string;
    driver_name?: string | null;
    driver_dni?: string | null;
    plate_number?: string | null;
    period?: { id: number; name: string } | null;
};

type InductionDetail = {
    id: number;
    acta_number?: string | null;
    document_code?: string | null;
    document_revision?: string | null;
    document_date?: string | null;
    risst_code?: string | null;
    risst_revision?: string | null;
    risst_date?: string | null;
    risst_approval_date?: string | null;
    risst_version?: string | null;
    title: string;
    temario?: string | null;
    activity?: string | null;
    scheduled_at: string;
    session_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
    sede?: string | null;
    zone?: string | null;
    location?: string | null;
    speaker_name?: string | null;
    status: string;
    period?: { id: number; name: string } | null;
    attendees: Attendee[];
    all_signed?: boolean;
    speaker_signed?: boolean;
    speaker_signature_url?: string | null;
    has_verification_photo?: boolean;
    verification_photo_url?: string | null;
    can_finalize?: boolean;
    can_start?: boolean;
    can_manage_attendance?: boolean;
    regulations?: { id: number; name: string; url: string | null }[];
    certificate_templates?: { id: number; name: string }[];
};

type StatusOption = { value: string; label: string };

export type InductionShowProps = {
    induction: InductionDetail;
    availableUnits: UnitOption[];
    attendeeStatusOptions: StatusOption[];
    statusOptions: StatusOption[];
    formOptions?: InductionFormOptions;
    periodOptions?: PeriodOption[];
    unitFilters: {
        unit_search: string;
    };
};

const statusTone: Record<string, string> = {
    draft: 'bg-slate-100 text-slate-700',
    scheduled: 'bg-sky-50 text-sky-800',
    in_progress: 'bg-amber-50 text-amber-800',
    closed: 'bg-emerald-50 text-emerald-800',
    cancelled: 'bg-red-50 text-red-700',
    registered: 'bg-slate-100 text-slate-700',
    attended: 'bg-emerald-50 text-emerald-800',
    absent: 'bg-red-50 text-red-700',
};

function formatDateTime(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    // Normaliza espacios Unicode (p. m. del Intl) para evitar mismatch de hidratación.
    return date
        .toLocaleString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
        .replace(/\./g, '')
        .replace(/[\u00a0\u202f\u2009]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function labelOf(status: string, options: StatusOption[]): string {
    return options.find((item) => item.value === status)?.label ?? status;
}

type Props = {
    snapshot?: InductionShowProps | null;
    onBack?: () => void;
};

export function InductionShowPage({ snapshot = null, onBack }: Props = {}) {
    const pageProps = usePage().props as unknown as InductionShowProps;
    const [draft, setDraft] = useState<InductionShowProps | null>(
        snapshot ?? null,
    );
    const offlineSession = snapshot !== null || !isBrowserOnline();
    const base = draft ?? snapshot ?? pageProps;
    const {
        induction,
        availableUnits,
        attendeeStatusOptions,
        statusOptions,
        formOptions,
        periodOptions,
        unitFilters,
    } = base;

    const persistDraft = (next: InductionShowProps) => {
        setDraft(next);
        void saveInductionSnapshot(next.induction.id, next);
    };

    const patchInduction = (
        updater: (current: InductionDetail) => InductionDetail,
    ) => {
        const next = {
            ...base,
            induction: updater(base.induction),
        };
        persistDraft(next);
    };

    const { can } = useCan();
    const canUpdate = can('inductions.update');
    const canCopy =
        can('inductions.duplicate') && induction.status === 'closed';
    const [copyOpen, setCopyOpen] = useState(false);
    const locked =
        induction.status === 'closed' || induction.status === 'cancelled';
    const canStart =
        induction.status === 'scheduled' &&
        (induction.can_start ??
            (() => {
                const at = new Date(induction.scheduled_at);

                return (
                    !Number.isNaN(at.getTime()) && Date.now() >= at.getTime()
                );
            })());
    const canManageAttendance =
        induction.can_manage_attendance ??
        induction.status === 'in_progress';
    const canFinalize =
        induction.status === 'in_progress' &&
        Boolean(induction.can_finalize);

    const [selected, setSelected] = useState<number[]>([]);
    const [pulling, setPulling] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [bulkBusy, setBulkBusy] = useState(false);
    const [savingVerificationPhoto, setSavingVerificationPhoto] =
        useState(false);
    const [signing, setSigning] = useState<Attendee | null>(null);
    const [reuseSaved, setReuseSaved] = useState(false);
    const [signingSpeaker, setSigningSpeaker] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(
        null,
    );
    const [fingerprintDataUrl, setFingerprintDataUrl] = useState<string | null>(
        null,
    );
    const [savingSignature, setSavingSignature] = useState(false);

    useEffect(() => {
        if (snapshot || !induction?.id) {
            return;
        }

        // Sesión online: cachea copia para campo sin señal.
        void saveInductionSnapshot(induction.id, {
            induction,
            availableUnits,
            attendeeStatusOptions,
            statusOptions,
            formOptions,
            periodOptions,
            unitFilters,
        });
    }, [
        attendeeStatusOptions,
        availableUnits,
        formOptions,
        induction,
        periodOptions,
        snapshot,
        statusOptions,
        unitFilters,
    ]);

    useEffect(() => {
        if (!snapshot) {
            setDraft(null);
        }
    }, [pageProps.induction?.id, pageProps.induction?.status, snapshot]);

    const signedCount = useMemo(
        () => induction.attendees.filter((item) => item.is_signed).length,
        [induction.attendees],
    );

    const counts = useMemo(() => {
        const total = induction.attendees.length;
        const attended = induction.attendees.filter(
            (item) => item.status === 'attended',
        ).length;
        const absent = induction.attendees.filter(
            (item) => item.status === 'absent',
        ).length;

        return {
            total,
            attended,
            absent,
            registered: total - attended - absent,
            signed: signedCount,
        };
    }, [induction.attendees, signedCount]);

    const visitUnits = (params: { unit_search?: string }) => {
        if (!isBrowserOnline()) {
            toast.info(
                'Sin señal: la búsqueda de unidades espera a reconectar.',
            );

            return;
        }

        const nextSearch = params.unit_search ?? unitFilters.unit_search;

        router.get(
            `/inducciones/${induction.id}`,
            {
                unit_search: nextSearch,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
                only: ['availableUnits', 'unitFilters'],
            },
        );
    };

    const toggleUnit = (id: number) => {
        setSelected((prev) =>
            prev.includes(id)
                ? prev.filter((item) => item !== id)
                : [...prev, id],
        );
    };

    const pull = () => {
        if (!canUpdate || locked || selected.length === 0 || pulling) {
            return;
        }

        const units = availableUnits.filter((unit) => selected.includes(unit.id));
        setPulling(true);
        visitOrQueue(
            'post',
            `/inducciones/${induction.id}/asistentes`,
            { unit_ids: selected },
            {
                preserveScroll: true,
                onQueued: () => {
                    patchInduction((current) => {
                        const existing = new Set(
                            current.attendees.map((row) => row.unit_id ?? row.id),
                        );
                        const added = units
                            .filter((unit) => !existing.has(unit.id))
                            .map((unit) => ({
                                id: -unit.id,
                                unit_id: unit.id,
                                driver_name: unit.driver_name || 'Conductor',
                                driver_dni: unit.driver_dni,
                                plate_number: unit.plate_number,
                                correlative: unit.correlative,
                                status: 'registered',
                                is_signed: false,
                                has_fingerprint: false,
                            }));

                        return {
                            ...current,
                            attendees: [...current.attendees, ...added],
                        };
                    });
                    setSelected([]);
                },
                onSuccess: () => setSelected([]),
                onFinish: () => setPulling(false),
            },
        );
    };

    const setAttendeeStatus = (attendee: Attendee, status: string) => {
        if (!canUpdate || locked || !canManageAttendance) {
            return;
        }

        setBusyId(attendee.id);
        visitOrQueue(
            'patch',
            `/inducciones/${induction.id}/asistentes/${attendee.id}`,
            { status },
            {
                preserveScroll: true,
                onQueued: () => {
                    patchInduction((current) => ({
                        ...current,
                        attendees: current.attendees.map((row) =>
                            row.id === attendee.id ? { ...row, status } : row,
                        ),
                    }));
                },
                onFinish: () => setBusyId(null),
            },
        );
    };

    const markAllAttended = () => {
        if (
            !canUpdate ||
            locked ||
            !canManageAttendance ||
            bulkBusy ||
            induction.attendees.length === 0
        ) {
            return;
        }

        setBulkBusy(true);
        visitOrQueue(
            'patch',
            `/inducciones/${induction.id}/asistentes-estado`,
            { status: 'attended' },
            {
                preserveScroll: true,
                onQueued: () => {
                    patchInduction((current) => ({
                        ...current,
                        attendees: current.attendees.map((row) => ({
                            ...row,
                            status: 'attended',
                        })),
                    }));
                },
                onFinish: () => setBulkBusy(false),
            },
        );
    };

    const removeAttendee = (attendee: Attendee) => {
        if (!canUpdate || locked) {
            return;
        }

        setBusyId(attendee.id);
        visitOrQueue(
            'delete',
            `/inducciones/${induction.id}/asistentes/${attendee.id}`,
            {},
            {
                preserveScroll: true,
                onQueued: () => {
                    patchInduction((current) => ({
                        ...current,
                        attendees: current.attendees.filter(
                            (row) => row.id !== attendee.id,
                        ),
                    }));
                },
                onFinish: () => setBusyId(null),
            },
        );
    };

    const patchInductionStatus = (status: string) => {
        if (!canUpdate) {
            return;
        }

        visitOrQueue(
            'patch',
            `/inducciones/${induction.id}/estado`,
            { status },
            {
                preserveScroll: true,
                onQueued: () => {
                    patchInduction((current) => ({
                        ...current,
                        status,
                        can_manage_attendance: status === 'in_progress',
                        can_finalize: status === 'in_progress',
                        can_start: status === 'scheduled',
                    }));
                },
            },
        );
    };

    const saveVerificationPhoto = (dataUrl: string) => {
        if (!canUpdate || savingVerificationPhoto || locked || !induction.id) {
            return;
        }

        setSavingVerificationPhoto(true);

        void (async () => {
            try {
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const formData = new FormData();
                formData.append(
                    'photo',
                    blob,
                    `verificacion-${induction.id}.jpg`,
                );

                visitOrQueue(
                    'post',
                    `/inducciones/${induction.id}/foto-verificacion`,
                    formData,
                    {
                        forceFormData: true,
                        preserveScroll: true,
                        onQueued: () => {
                            patchInduction((current) => ({
                                ...current,
                                has_verification_photo: true,
                                verification_photo_url: dataUrl,
                            }));
                        },
                        onError: () => {
                            setSavingVerificationPhoto(false);
                        },
                        onFinish: () => setSavingVerificationPhoto(false),
                    },
                );
            } catch {
                setSavingVerificationPhoto(false);
                toast.error('No se pudo preparar la foto.');
            }
        })();
    };

    const removeVerificationPhoto = () => {
        if (!canUpdate || savingVerificationPhoto || locked) {
            return;
        }

        setSavingVerificationPhoto(true);
        visitOrQueue(
            'delete',
            `/inducciones/${induction.id}/foto-verificacion`,
            {},
            {
                preserveScroll: true,
                onQueued: () => {
                    patchInduction((current) => ({
                        ...current,
                        has_verification_photo: false,
                        verification_photo_url: null,
                    }));
                },
                onFinish: () => setSavingVerificationPhoto(false),
            },
        );
    };

    const openSign = (attendee: Attendee) => {
        if (!canManageAttendance) {
            return;
        }

        setSigningSpeaker(false);
        setSigning(attendee);
        setReuseSaved(false);
        setSignatureDataUrl(null);
        setFingerprintDataUrl(null);
    };

    const closeSignModal = () => {
        setSigning(null);
        setSigningSpeaker(false);
        setReuseSaved(false);
        setSignatureDataUrl(null);
        setFingerprintDataUrl(null);
    };

    const canReuseSaved = Boolean(
        signing?.saved_signature_url && signing?.saved_fingerprint_url,
    );
    const canSaveSign = signingSpeaker
        ? Boolean(signatureDataUrl)
        : reuseSaved || Boolean(signatureDataUrl && fingerprintDataUrl);

    const saveSignature = () => {
        if (!canSaveSign || savingSignature) {
            return;
        }

        setSavingSignature(true);

        if (signingSpeaker) {
            visitOrQueue(
                'post',
                `/inducciones/${induction.id}/firma-expositor`,
                { signature_data_url: signatureDataUrl },
                {
                    preserveScroll: true,
                    onQueued: () => {
                        patchInduction((current) => ({
                            ...current,
                            speaker_signed: true,
                            speaker_signature_url: signatureDataUrl,
                        }));
                        closeSignModal();
                    },
                    onSuccess: () => closeSignModal(),
                    onFinish: () => setSavingSignature(false),
                },
            );
            return;
        }

        if (!signing) {
            setSavingSignature(false);

            return;
        }

        const attendeeId = signing.id;
        visitOrQueue(
            'post',
            `/inducciones/${induction.id}/asistentes/${attendeeId}/firma`,
            reuseSaved
                ? { reuse: true }
                : {
                      signature_data_url: signatureDataUrl,
                      fingerprint_data_url: fingerprintDataUrl,
                  },
            {
                preserveScroll: true,
                onQueued: () => {
                    patchInduction((current) => ({
                        ...current,
                        attendees: current.attendees.map((row) =>
                            row.id === attendeeId
                                ? {
                                      ...row,
                                      is_signed: true,
                                      has_fingerprint: true,
                                      signature_url:
                                          signatureDataUrl ??
                                          row.saved_signature_url ??
                                          row.signature_url,
                                      fingerprint_url:
                                          fingerprintDataUrl ??
                                          row.saved_fingerprint_url ??
                                          row.fingerprint_url,
                                  }
                                : row,
                        ),
                    }));
                    closeSignModal();
                },
                onSuccess: () => closeSignModal(),
                onFinish: () => setSavingSignature(false),
            },
        );
    };

    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="shrink-0 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        {onBack ? (
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onBack}
                                className="-ml-2 h-8 cursor-pointer px-2 text-brand-500 hover:bg-brand-100 hover:text-brand-700"
                            >
                                <ArrowLeft className="size-4" />
                                Volver a configuración
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="ghost"
                                asChild
                                className="-ml-2 h-8 cursor-pointer px-2 text-brand-500 hover:bg-brand-100 hover:text-brand-700"
                            >
                                <Link href="/inducciones">
                                    <ArrowLeft className="size-4" />
                                    Volver a configuración
                                </Link>
                            </Button>
                        )}
                        {offlineSession ? (
                            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                {isBrowserOnline()
                                    ? 'Trabajando con copia local. Los cambios se envían al estabilizar la señal.'
                                    : 'Sin conexión. Puedes firmar, marcar asistencia y guardar en este teléfono; se enviará al reconectar.'}
                            </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="font-display text-2xl font-semibold text-brand-700">
                                {induction.title}
                            </h1>
                            {canCopy ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        if (!isBrowserOnline()) {
                                            toast.info(
                                                'Copiar necesita conexión. La sesión sí se puede seguir editando offline.',
                                            );

                                            return;
                                        }

                                        setCopyOpen(true);
                                    }}
                                    className="h-8 cursor-pointer border-brand-300 text-brand-700 hover:bg-brand-100"
                                >
                                    <Copy className="size-4" />
                                    Copiar
                                </Button>
                            ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Acta {induction.acta_number || '—'} ·{' '}
                            {formatDateTime(induction.scheduled_at)}
                            {induction.sede || induction.location
                                ? ` · ${induction.sede || induction.location}`
                                : ''}
                            {induction.zone ? ` · ${induction.zone}` : ''}
                            {induction.period?.name
                                ? ` · ${induction.period.name}`
                                : ''}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                            <span
                                className={cn(
                                    'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                                    statusTone[induction.status],
                                )}
                            >
                                {labelOf(induction.status, statusOptions)}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-background px-2.5 py-1 text-xs text-muted-foreground">
                                <Users className="size-3.5" />
                                Firmas {counts.signed}/{counts.total}
                            </span>
                        </div>
                        {!locked ? (
                            <p className="text-xs text-muted-foreground">
                                {induction.status === 'scheduled'
                                    ? canStart
                                        ? 'Ya puedes iniciar la inducción. Luego se habilitan asistencia, firmas y huellas.'
                                        : 'El botón Iniciar aparece al llegar la fecha y hora programada. Edita la inducción si necesitas adelantar.'
                                    : induction.status === 'in_progress'
                                      ? 'Firman asistentes y expositor, y sube la foto de verificación para poder finalizar.'
                                      : null}
                            </p>
                        ) : null}
                    </div>

                    {canUpdate || induction.status === 'closed' ? (
                        <div className="flex flex-wrap gap-2">
                            {canUpdate && canStart ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        patchInductionStatus('in_progress')
                                    }
                                    className="cursor-pointer border-amber-200 text-amber-800 hover:bg-amber-50 hover:text-amber-900"
                                >
                                    Iniciar
                                </Button>
                            ) : null}
                            {canUpdate && canFinalize ? (
                                <Button
                                    type="button"
                                    onClick={() =>
                                        patchInductionStatus('closed')
                                    }
                                    className="cursor-pointer bg-brand-500 text-white hover:bg-brand-700"
                                    title="Finalizar inducción"
                                >
                                    Finalizar
                                </Button>
                            ) : null}
                            {canUpdate &&
                            induction.status === 'in_progress' &&
                            !induction.can_finalize ? (
                                <p className="self-center text-xs text-muted-foreground">
                                    {!induction.speaker_signed ||
                                    !induction.all_signed
                                        ? 'Firma asistentes y expositor.'
                                        : !induction.has_verification_photo
                                          ? 'Sube la foto de verificación para finalizar.'
                                          : 'Completa los requisitos para finalizar.'}
                                </p>
                            ) : null}
                            {induction.status === 'closed' ? (
                                <Button
                                    type="button"
                                    onClick={() => {
                                        void openInductionPdf(induction.id);
                                    }}
                                    className="cursor-pointer bg-brand-700 text-white hover:bg-brand-700"
                                >
                                    <FileText className="size-4" />
                                    Ver documentos
                                </Button>
                            ) : null}
                            {canUpdate && locked ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        patchInductionStatus('scheduled')
                                    }
                                    className="cursor-pointer border-brand-300 text-brand-700"
                                >
                                    Reabrir
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            <InductionMailPanels
                inductionId={induction.id}
                status={induction.status}
                regulations={induction.regulations ?? []}
                templates={induction.certificate_templates ?? []}
                attendees={induction.attendees.map((attendee) => ({
                    id: attendee.id,
                    name: attendee.driver_name,
                }))}
            />

            <div className="grid shrink-0 gap-4 xl:grid-cols-2">
                <section className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm">
                    <div className="border-b border-brand-200 px-4 py-3">
                        <h2 className="text-sm font-semibold text-brand-700">
                            Jalar conductores desde unidades
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            Solo unidades activas. Si el conductor ya tiene esta
                            inducción vigente (un año), no aparece.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 border-b border-brand-200 px-3 py-2.5 sm:flex-row sm:items-center">
                        <TableSearchFilter
                            value={unitFilters.unit_search}
                            onChange={(unit_search) =>
                                visitUnits({ unit_search })
                            }
                            placeholder="Buscar conductor, DNI, placa..."
                            className="max-w-none"
                        />
                    </div>
                    {locked ? (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            La inducción está cerrada.
                        </p>
                    ) : availableUnits.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            No hay conductores disponibles.
                        </p>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-2 border-b border-[#eef2f7] px-3 py-2">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setSelected(
                                            selected.length ===
                                                availableUnits.length
                                                ? []
                                                : availableUnits.map((u) => u.id),
                                        )
                                    }
                                    className="cursor-pointer text-xs font-medium text-brand-500 hover:underline"
                                >
                                    {selected.length === availableUnits.length
                                        ? 'Quitar selección'
                                        : 'Seleccionar todos'}
                                </button>
                                <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                        !canUpdate ||
                                        selected.length === 0 ||
                                        pulling
                                    }
                                    onClick={pull}
                                    className="cursor-pointer bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-50"
                                >
                                    {pulling ? (
                                        <Spinner />
                                    ) : (
                                        <Download className="size-3.5" />
                                    )}
                                    Jalar ({selected.length})
                                </Button>
                            </div>
                            <ul className="max-h-[28rem] divide-y divide-[#eef2f7] overflow-y-auto">
                                {availableUnits.map((unit) => {
                                    const checked = selected.includes(unit.id);

                                    return (
                                        <li
                                            key={unit.id}
                                            className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-background"
                                            onClick={() => toggleUnit(unit.id)}
                                        >
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={() =>
                                                    toggleUnit(unit.id)
                                                }
                                                className="mt-0.5 size-4 border-brand-300 shadow-none hover:border-brand-400 data-[state=checked]:border-brand-500 data-[state=checked]:bg-brand-500 data-[state=checked]:text-white"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-brand-700">
                                                    {unit.driver_name ||
                                                        'Sin conductor'}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                    {unit.correlative}
                                                    {unit.plate_number
                                                        ? ` · ${unit.plate_number}`
                                                        : ''}
                                                    {unit.driver_dni
                                                        ? ` · DNI ${unit.driver_dni}`
                                                        : ''}
                                                    {unit.period?.name
                                                        ? ` · ${unit.period.name}`
                                                        : ''}
                                                </p>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </>
                    )}
                </section>

                <section className="overflow-hidden rounded-2xl border border-brand-200 bg-white shadow-sm">
                    <div className="border-b border-brand-200 px-4 py-3">
                        <h2 className="text-sm font-semibold text-brand-700">
                            Asistentes ({counts.total})
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                            {canManageAttendance
                                ? 'Firma cada asistente. Luego firma el expositor.'
                                : 'Puedes jalar conductores. Asistencia, firmas y huellas se habilitan al iniciar la inducción.'}
                        </p>
                    </div>

                    <div className="border-b border-[#eef2f7] px-3 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium text-brand-700">
                                    Expositor
                                    {induction.speaker_name
                                        ? `: ${induction.speaker_name}`
                                        : ''}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                    Firma obligatoria para cerrar la inducción
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {induction.speaker_signed ? (
                                    <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                        Firmado
                                    </span>
                                ) : (
                                    <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                        Sin firma
                                    </span>
                                )}
                                {canUpdate && canManageAttendance ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => {
                                            setSigning(null);
                                            setSigningSpeaker(true);
                                            setSignatureDataUrl(null);
                                            setFingerprintDataUrl(null);
                                        }}
                                        className="cursor-pointer bg-brand-500 text-white hover:bg-brand-700"
                                    >
                                        <PenLine className="size-3.5" />
                                        Firmar expositor
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                        {induction.speaker_signature_url ? (
                            <img
                                src={induction.speaker_signature_url}
                                alt="Firma expositor"
                                className="mt-2 h-12 rounded border border-brand-200 bg-white object-contain"
                            />
                        ) : null}
                    </div>

                    {induction.attendees.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                            Aún no hay conductores en esta inducción.
                        </p>
                    ) : (
                        <>
                            {canUpdate && canManageAttendance ? (
                                <div className="flex items-center justify-between gap-2 border-b border-[#eef2f7] px-3 py-2">
                                    <button
                                        type="button"
                                        onClick={markAllAttended}
                                        disabled={bulkBusy}
                                        className="cursor-pointer text-xs font-medium text-brand-500 hover:underline disabled:opacity-50"
                                    >
                                        {bulkBusy
                                            ? 'Actualizando…'
                                            : 'Marcar todos como asistieron'}
                                    </button>
                                    <span className="text-[11px] text-muted-foreground">
                                        {
                                            induction.attendees.filter(
                                                (item) =>
                                                    item.status === 'attended',
                                            ).length
                                        }
                                        /{induction.attendees.length} asistieron
                                    </span>
                                </div>
                            ) : canUpdate &&
                              !locked &&
                              induction.status === 'scheduled' ? (
                                <p className="border-b border-[#eef2f7] px-3 py-2 text-xs text-muted-foreground">
                                    Inicia la inducción para marcar asistencia y
                                    capturar firmas/huellas.
                                </p>
                            ) : null}
                            <ul className="max-h-[32rem] divide-y divide-[#eef2f7] overflow-y-auto">
                            {induction.attendees.map((attendee) => (
                                <li
                                    key={attendee.id}
                                    className="space-y-2 px-3 py-2.5"
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-brand-700">
                                                {attendee.driver_name}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                DNI {attendee.driver_dni || '—'}
                                                {attendee.plate_number
                                                    ? ` · ${attendee.plate_number}`
                                                    : ''}
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5">
                                            {attendee.is_signed ? (
                                                <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                                    Firmado
                                                    {attendee.has_fingerprint
                                                        ? ' + huella'
                                                        : ''}
                                                </span>
                                            ) : attendee.saved_signature_url &&
                                              attendee.saved_fingerprint_url ? (
                                                <span className="inline-flex rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800">
                                                    Firma guardada
                                                </span>
                                            ) : (
                                                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                                    Sin firma
                                                </span>
                                            )}

                                            {canUpdate && canManageAttendance ? (
                                                <>
                                                    <Select
                                                        modal={false}
                                                        value={
                                                            attendee.status ||
                                                            'registered'
                                                        }
                                                        onValueChange={(
                                                            status,
                                                        ) =>
                                                            setAttendeeStatus(
                                                                attendee,
                                                                status,
                                                            )
                                                        }
                                                        disabled={
                                                            busyId ===
                                                                attendee.id ||
                                                            bulkBusy
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8 w-[8.5rem] cursor-pointer border-brand-300 bg-white text-xs">
                                                            <SelectValue placeholder="Estado" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white">
                                                            {attendeeStatusOptions.map(
                                                                (option) => (
                                                                    <SelectItem
                                                                        key={
                                                                            option.value
                                                                        }
                                                                        value={
                                                                            option.value
                                                                        }
                                                                        className="cursor-pointer text-xs"
                                                                    >
                                                                        {
                                                                            option.label
                                                                        }
                                                                    </SelectItem>
                                                                ),
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            openSign(attendee)
                                                        }
                                                        className="size-8 cursor-pointer text-brand-500 hover:bg-brand-100 hover:text-brand-700"
                                                        title="Firmar"
                                                    >
                                                        <PenLine className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={
                                                            busyId ===
                                                                attendee.id ||
                                                            bulkBusy
                                                        }
                                                        onClick={() =>
                                                            setAttendeeStatus(
                                                                attendee,
                                                                'attended',
                                                            )
                                                        }
                                                        className="size-8 cursor-pointer text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                                                        title="Asistió"
                                                    >
                                                        <Check className="size-3.5" />
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={
                                                            busyId ===
                                                                attendee.id ||
                                                            bulkBusy
                                                        }
                                                        onClick={() =>
                                                            setAttendeeStatus(
                                                                attendee,
                                                                'absent',
                                                            )
                                                        }
                                                        className="size-8 cursor-pointer text-red-500 hover:bg-red-50 hover:text-red-700"
                                                        title="No asistió"
                                                    >
                                                        <X className="size-3.5" />
                                                    </Button>
                                                </>
                                            ) : null}
                                            {canUpdate && !locked ? (
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={
                                                            busyId ===
                                                                attendee.id ||
                                                            bulkBusy
                                                        }
                                                        onClick={() =>
                                                            removeAttendee(
                                                                attendee,
                                                            )
                                                        }
                                                        className="size-8 cursor-pointer text-muted-foreground hover:bg-[#eef2f7] hover:text-red-600"
                                                        title="Quitar"
                                                    >
                                                        <UserMinus className="size-3.5" />
                                                    </Button>
                                            ) : null}
                                        </div>
                                    </div>
                                    {(attendee.signature_url ||
                                        attendee.fingerprint_url) && (
                                        <div className="flex flex-wrap gap-2">
                                            {attendee.signature_url ? (
                                                <img
                                                    src={attendee.signature_url}
                                                    alt={`Firma ${attendee.driver_name}`}
                                                    className="h-12 rounded border border-brand-200 bg-white object-contain"
                                                />
                                            ) : null}
                                            {attendee.fingerprint_url ? (
                                                <img
                                                    src={
                                                        attendee.fingerprint_url
                                                    }
                                                    alt={`Huella ${attendee.driver_name}`}
                                                    className="h-12 w-10 rounded border border-brand-200 bg-white object-contain"
                                                />
                                            ) : null}
                                        </div>
                                    )}
                                </li>
                            ))}
                            </ul>
                        </>
                    )}
                </section>
            </div>

            {induction.status === 'in_progress' ||
            induction.has_verification_photo ? (
                <section className="shrink-0 rounded-2xl border border-brand-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-brand-700">
                                Foto de verificación
                            </h2>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                Obligatoria antes de finalizar. Se adjunta al
                                final del PDF de registro e identifica la
                                sesión.
                            </p>
                        </div>
                        {induction.has_verification_photo ? (
                            <span className="inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                                Lista
                            </span>
                        ) : (
                            <span className="inline-flex w-fit rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                                Pendiente
                            </span>
                        )}
                    </div>

                    {locked ? (
                        induction.verification_photo_url ? (
                            <img
                                src={induction.verification_photo_url}
                                alt="Foto de verificación"
                                className="max-h-72 w-full rounded-xl border border-brand-200 object-contain"
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground">
                                Sin foto de verificación.
                            </p>
                        )
                    ) : canUpdate ? (
                        <VerificationPhotoCapture
                            existingUrl={induction.verification_photo_url}
                            disabled={!canManageAttendance}
                            saving={savingVerificationPhoto}
                            onSave={saveVerificationPhoto}
                            onRemove={
                                induction.has_verification_photo
                                    ? removeVerificationPhoto
                                    : undefined
                            }
                        />
                    ) : induction.verification_photo_url ? (
                        <img
                            src={induction.verification_photo_url}
                            alt="Foto de verificación"
                            className="max-h-72 w-full rounded-xl border border-brand-200 object-contain"
                        />
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            No tienes permiso para subir la foto de
                            verificación.
                        </p>
                    )}
                </section>
            ) : null}

            <AppModal
                open={Boolean(signing) || signingSpeaker}
                onClose={() => {
                    if (savingSignature) {
                        return;
                    }

                    closeSignModal();
                }}
                title={
                    signingSpeaker
                        ? `Firmar expositor${induction.speaker_name ? ` · ${induction.speaker_name}` : ''}`
                        : signing
                          ? `Firma y huella · ${signing.driver_name}`
                          : 'Firmar'
                }
                description={
                    signingSpeaker
                        ? 'Firma del expositor requerida para cerrar la inducción.'
                        : 'Firma con el dedo. La huella es una foto de cerca: llena el círculo con la yema y captura.'
                }
                className="sm:max-w-lg"
                bodyClassName="max-h-[70vh]"
                footer={
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={savingSignature}
                            onClick={closeSignModal}
                            className="cursor-pointer border-brand-300 text-brand-700"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            disabled={!canSaveSign || savingSignature}
                            onClick={saveSignature}
                            className="cursor-pointer bg-brand-500 text-white hover:bg-brand-700 disabled:opacity-50"
                        >
                            {savingSignature ? <Spinner /> : null}
                            {signingSpeaker
                                ? 'Guardar firma'
                                : 'Guardar firma y huella'}
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    {canReuseSaved ? (
                        <button
                            type="button"
                            onClick={() => setReuseSaved((current) => !current)}
                            className={
                                reuseSaved
                                    ? 'w-full cursor-pointer rounded-xl border border-[#166534] bg-emerald-50 px-3 py-2 text-left text-xs font-semibold text-[#166534]'
                                    : 'w-full cursor-pointer rounded-xl border border-brand-300 bg-background px-3 py-2 text-left text-xs font-semibold text-brand-700'
                            }
                        >
                            {reuseSaved
                                ? 'Se usará la firma y la huella guardadas'
                                : 'Usar firma y huella guardadas'}
                        </button>
                    ) : null}
                    <div className="space-y-1.5">
                        <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
                            Firma
                        </p>
                        <SignaturePad
                            valueUrl={
                                signingSpeaker
                                    ? induction.speaker_signature_url
                                    : signing?.signature_url
                            }
                            onChange={(value) => {
                                setReuseSaved(false);
                                setSignatureDataUrl(value);
                            }}
                        />
                    </div>

                    {!signingSpeaker ? (
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold tracking-wide text-brand-700 uppercase">
                                Huella
                            </p>
                            <FingerprintCameraCapture
                                valueUrl={signing?.fingerprint_url}
                                onChange={(value) => {
                                    setReuseSaved(false);
                                    setFingerprintDataUrl(value);
                                }}
                                disabled={savingSignature}
                            />
                        </div>
                    ) : null}
                </div>
            </AppModal>

            <InductionFormModal
                open={copyOpen}
                copying
                induction={induction as unknown as InductionItem}
                periodOptions={periodOptions ?? []}
                formOptions={
                    formOptions ?? {
                        types: [],
                        activities: [],
                        modalities: [],
                        schools: [],
                        categories: [],
                        sites: [],
                    }
                }
                onClose={() => setCopyOpen(false)}
            />
        </div>
    );
}
