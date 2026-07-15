import { Link, router, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    Check,
    Download,
    FileDown,
    PenLine,
    UserMinus,
    Users,
    X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { SignaturePad } from '@/components/checklists/signature-pad';
import { FingerprintCameraCapture } from '@/components/inductions/fingerprint-camera-capture';
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
};

type UnitOption = {
    id: number;
    correlative: string;
    driver_name?: string | null;
    driver_dni?: string | null;
    plate_number?: string | null;
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
};

type StatusOption = { value: string; label: string };

type PageProps = {
    induction: InductionDetail;
    availableUnits: UnitOption[];
    attendeeStatusOptions: StatusOption[];
    statusOptions: StatusOption[];
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

export function InductionShowPage() {
    const {
        induction,
        availableUnits,
        attendeeStatusOptions,
        statusOptions,
        unitFilters,
    } = usePage().props as unknown as PageProps;
    const { can } = useCan();
    const canUpdate = can('inductions.update');
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
    const [signingSpeaker, setSigningSpeaker] = useState(false);
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(
        null,
    );
    const [fingerprintDataUrl, setFingerprintDataUrl] = useState<string | null>(
        null,
    );
    const [savingSignature, setSavingSignature] = useState(false);

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

        setPulling(true);
        router.post(
            `/inducciones/${induction.id}/asistentes`,
            { unit_ids: selected },
            {
                preserveScroll: true,
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
        router.patch(
            `/inducciones/${induction.id}/asistentes/${attendee.id}`,
            { status },
            {
                preserveScroll: true,
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
        router.patch(
            `/inducciones/${induction.id}/asistentes-estado`,
            { status: 'attended' },
            {
                preserveScroll: true,
                onFinish: () => setBulkBusy(false),
            },
        );
    };

    const removeAttendee = (attendee: Attendee) => {
        if (!canUpdate || locked) {
            return;
        }

        setBusyId(attendee.id);
        router.delete(
            `/inducciones/${induction.id}/asistentes/${attendee.id}`,
            {
                preserveScroll: true,
                onFinish: () => setBusyId(null),
            },
        );
    };

    const patchInductionStatus = (status: string) => {
        if (!canUpdate) {
            return;
        }

        router.patch(
            `/inducciones/${induction.id}/estado`,
            { status },
            { preserveScroll: true },
        );
    };

    const saveVerificationPhoto = (dataUrl: string) => {
        if (!canUpdate || savingVerificationPhoto || locked) {
            return;
        }

        setSavingVerificationPhoto(true);
        router.post(
            `/inducciones/${induction.id}/foto-verificacion`,
            { photo_data_url: dataUrl },
            {
                preserveScroll: true,
                onFinish: () => setSavingVerificationPhoto(false),
            },
        );
    };

    const removeVerificationPhoto = () => {
        if (!canUpdate || savingVerificationPhoto || locked) {
            return;
        }

        setSavingVerificationPhoto(true);
        router.delete(`/inducciones/${induction.id}/foto-verificacion`, {
            preserveScroll: true,
            onFinish: () => setSavingVerificationPhoto(false),
        });
    };

    const openSign = (attendee: Attendee) => {
        if (!canManageAttendance) {
            return;
        }

        setSigningSpeaker(false);
        setSigning(attendee);
        setSignatureDataUrl(null);
        setFingerprintDataUrl(null);
    };

    const closeSignModal = () => {
        setSigning(null);
        setSigningSpeaker(false);
        setSignatureDataUrl(null);
        setFingerprintDataUrl(null);
    };

    const canSaveSign = signingSpeaker
        ? Boolean(signatureDataUrl)
        : Boolean(signatureDataUrl && fingerprintDataUrl);

    const saveSignature = () => {
        if (!canSaveSign || savingSignature) {
            return;
        }

        setSavingSignature(true);

        if (signingSpeaker) {
            router.post(
                `/inducciones/${induction.id}/firma-expositor`,
                { signature_data_url: signatureDataUrl },
                {
                    preserveScroll: true,
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

        router.post(
            `/inducciones/${induction.id}/asistentes/${signing.id}/firma`,
            {
                signature_data_url: signatureDataUrl,
                fingerprint_data_url: fingerprintDataUrl,
            },
            {
                preserveScroll: true,
                onSuccess: () => closeSignModal(),
                onFinish: () => setSavingSignature(false),
            },
        );
    };

    return (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
            <div className="shrink-0 rounded-2xl border border-[#d7e3f0] bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                        <Button
                            type="button"
                            variant="ghost"
                            asChild
                            className="-ml-2 h-8 cursor-pointer px-2 text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                        >
                            <Link href="/inducciones">
                                <ArrowLeft className="size-4" />
                                Volver a configuración
                            </Link>
                        </Button>
                        <h1 className="font-display text-2xl font-semibold text-[#1a2b4c]">
                            {induction.title}
                        </h1>
                        <p className="text-sm text-[#5a7390]">
                            Acta {induction.acta_number || '—'} ·{' '}
                            {formatDateTime(induction.scheduled_at)}
                            {induction.sede || induction.location
                                ? ` · ${induction.sede || induction.location}`
                                : ''}
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
                            <span className="inline-flex items-center gap-1 rounded-full border border-[#d7e3f0] bg-[#f8fafc] px-2.5 py-1 text-xs text-[#5a7390]">
                                <Users className="size-3.5" />
                                Firmas {counts.signed}/{counts.total}
                            </span>
                        </div>
                        {!locked ? (
                            <p className="text-xs text-[#6b8ead]">
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
                                    className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
                                    title="Finalizar inducción"
                                >
                                    Finalizar
                                </Button>
                            ) : null}
                            {canUpdate &&
                            induction.status === 'in_progress' &&
                            !induction.can_finalize ? (
                                <p className="self-center text-xs text-[#6b8ead]">
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
                                    asChild
                                    className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038]"
                                >
                                    <a href={`/inducciones/${induction.id}/pdf`}>
                                        <FileDown className="size-4" />
                                        Descargar documentos (ZIP)
                                    </a>
                                </Button>
                            ) : null}
                            {canUpdate && locked ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        patchInductionStatus('scheduled')
                                    }
                                    className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                                >
                                    Reabrir
                                </Button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="grid shrink-0 gap-4 xl:grid-cols-2">
                <section className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
                    <div className="border-b border-[#e2eaf3] px-4 py-3">
                        <h2 className="text-sm font-semibold text-[#1a2b4c]">
                            Jalar conductores desde unidades
                        </h2>
                        <p className="mt-0.5 text-xs text-[#6b8ead]">
                            Solo unidades del periodo de la inducción
                            {induction.period?.name
                                ? ` (${induction.period.name})`
                                : ''}
                            . Se toma DNI, nombres y cargo Conductor.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 border-b border-[#e2eaf3] px-3 py-2.5 sm:flex-row sm:items-center">
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
                        <p className="px-4 py-8 text-center text-sm text-[#6b8ead]">
                            La inducción está cerrada.
                        </p>
                    ) : !induction.period ? (
                        <p className="px-4 py-8 text-center text-sm text-[#6b8ead]">
                            Asigna un periodo a la inducción para poder jalar
                            conductores.
                        </p>
                    ) : availableUnits.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-[#6b8ead]">
                            No hay unidades disponibles en este periodo.
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
                                    className="cursor-pointer text-xs font-medium text-[#2e5a9e] hover:underline"
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
                                    className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c] disabled:opacity-50"
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
                                            className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-[#f8fafc]"
                                            onClick={() => toggleUnit(unit.id)}
                                        >
                                            <Checkbox
                                                checked={checked}
                                                onCheckedChange={() =>
                                                    toggleUnit(unit.id)
                                                }
                                                className="mt-0.5 size-4 border-[#c5d5e6] shadow-none hover:border-[#4a90e2] data-[state=checked]:border-[#2e5a9e] data-[state=checked]:bg-[#2e5a9e] data-[state=checked]:text-white"
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                            />
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-[#1a2b4c]">
                                                    {unit.driver_name ||
                                                        'Sin conductor'}
                                                </p>
                                                <p className="text-[11px] text-[#6b8ead]">
                                                    {unit.correlative}
                                                    {unit.plate_number
                                                        ? ` · ${unit.plate_number}`
                                                        : ''}
                                                    {unit.driver_dni
                                                        ? ` · DNI ${unit.driver_dni}`
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

                <section className="overflow-hidden rounded-2xl border border-[#d7e3f0] bg-white shadow-sm">
                    <div className="border-b border-[#e2eaf3] px-4 py-3">
                        <h2 className="text-sm font-semibold text-[#1a2b4c]">
                            Asistentes ({counts.total})
                        </h2>
                        <p className="mt-0.5 text-xs text-[#6b8ead]">
                            {canManageAttendance
                                ? 'Firma cada asistente. Luego firma el expositor.'
                                : 'Puedes jalar conductores. Asistencia, firmas y huellas se habilitan al iniciar la inducción.'}
                        </p>
                    </div>

                    <div className="border-b border-[#eef2f7] px-3 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm font-medium text-[#1a2b4c]">
                                    Expositor
                                    {induction.speaker_name
                                        ? `: ${induction.speaker_name}`
                                        : ''}
                                </p>
                                <p className="text-[11px] text-[#6b8ead]">
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
                                        className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c]"
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
                                className="mt-2 h-12 rounded border border-[#e2eaf3] bg-white object-contain"
                            />
                        ) : null}
                    </div>

                    {induction.attendees.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-[#6b8ead]">
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
                                        className="cursor-pointer text-xs font-medium text-[#2e5a9e] hover:underline disabled:opacity-50"
                                    >
                                        {bulkBusy
                                            ? 'Actualizando…'
                                            : 'Marcar todos como asistieron'}
                                    </button>
                                    <span className="text-[11px] text-[#6b8ead]">
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
                                <p className="border-b border-[#eef2f7] px-3 py-2 text-xs text-[#6b8ead]">
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
                                            <p className="text-sm font-medium text-[#1a2b4c]">
                                                {attendee.driver_name}
                                            </p>
                                            <p className="text-[11px] text-[#6b8ead]">
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
                                            ) : (
                                                <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                                    Sin firma
                                                </span>
                                            )}

                                            {canUpdate && canManageAttendance ? (
                                                <>
                                                    <Select
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
                                                        <SelectTrigger className="h-8 w-[8.5rem] cursor-pointer border-[#c5d5e6] bg-white text-xs">
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
                                                        className="size-8 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
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
                                                        className="size-8 cursor-pointer text-[#6b8ead] hover:bg-[#eef2f7] hover:text-red-600"
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
                                                    className="h-12 rounded border border-[#e2eaf3] bg-white object-contain"
                                                />
                                            ) : null}
                                            {attendee.fingerprint_url ? (
                                                <img
                                                    src={
                                                        attendee.fingerprint_url
                                                    }
                                                    alt={`Huella ${attendee.driver_name}`}
                                                    className="h-12 w-10 rounded border border-[#e2eaf3] bg-white object-contain"
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
                <section className="shrink-0 rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm sm:p-5">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-sm font-semibold text-[#1a2b4c]">
                                Foto de verificación
                            </h2>
                            <p className="mt-0.5 text-xs text-[#6b8ead]">
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
                                className="max-h-72 w-full rounded-xl border border-[#e2eaf3] object-contain"
                            />
                        ) : (
                            <p className="text-sm text-[#6b8ead]">
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
                            className="max-h-72 w-full rounded-xl border border-[#e2eaf3] object-contain"
                        />
                    ) : (
                        <p className="text-sm text-[#6b8ead]">
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
                        : 'Firma con el dedo y toma una foto directa de la huella (cámara macro/trasera).'
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
                            className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            disabled={!canSaveSign || savingSignature}
                            onClick={saveSignature}
                            className="cursor-pointer bg-[#2e5a9e] text-white hover:bg-[#1a2b4c] disabled:opacity-50"
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
                    <div className="space-y-1.5">
                        <p className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                            Firma
                        </p>
                        <SignaturePad
                            valueUrl={
                                signingSpeaker
                                    ? induction.speaker_signature_url
                                    : signing?.signature_url
                            }
                            onChange={setSignatureDataUrl}
                        />
                    </div>

                    {!signingSpeaker ? (
                        <div className="space-y-1.5">
                            <p className="text-xs font-semibold tracking-wide text-[#1a2b4c] uppercase">
                                Huella
                            </p>
                            <FingerprintCameraCapture
                                valueUrl={signing?.fingerprint_url}
                                onChange={setFingerprintDataUrl}
                                disabled={savingSignature}
                            />
                        </div>
                    ) : null}
                </div>
            </AppModal>
        </div>
    );
}
