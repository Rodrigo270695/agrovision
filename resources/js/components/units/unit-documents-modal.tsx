import {
    CheckCircle2,
    Circle,
    Download,
    FileText,
    Image as ImageIcon,
    Trash2,
    Upload,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { UnitItem } from '@/components/units/units-table';
import { DocumentExpiryBadge } from '@/components/units/document-expiry-badge';
import {
    DocumentsProgressBar,
    type DocumentsProgress,
} from '@/components/units/documents-progress-bar';
import { AppModal } from '@/components/shared/app-modal';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useCan } from '@/hooks/use-can';
import { getDocumentExpiryInfo } from '@/lib/document-expiry';
import { cn } from '@/lib/utils';

export type UnitDocumentTypeOption = {
    value: string;
    label: string;
    required?: boolean;
};

export type UnitDocumentItem = {
    id: number;
    unit_id: number;
    type: string;
    title?: string | null;
    original_name: string;
    mime_type?: string | null;
    size?: number | null;
    expires_at?: string | null;
    created_at?: string | null;
    uploader?: { id: number; name: string } | null;
};

type Props = {
    open: boolean;
    unit: UnitItem | null;
    documentTypes: UnitDocumentTypeOption[];
    onClose: () => void;
};

function formatBytes(size?: number | null): string {
    if (!size || size <= 0) {
        return '—';
    }

    if (size < 1024) {
        return `${size} B`;
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string | null): string {
    if (!value) {
        return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '—';
    }

    return date
        .toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        .replace('.', '');
}

function isPdf(doc: UnitDocumentItem): boolean {
    return (
        (doc.mime_type ?? '').toLowerCase().includes('pdf') ||
        doc.original_name.toLowerCase().endsWith('.pdf')
    );
}

function computeProgress(
    documents: UnitDocumentItem[],
    documentTypes: UnitDocumentTypeOption[],
): DocumentsProgress & {
    types: Array<{ value: string; label: string; uploaded: boolean }>;
} {
    const checklist = documentTypes.some((item) => item.required === true)
        ? documentTypes.filter((item) => item.required)
        : documentTypes.filter((item) => item.value !== 'other');

    const uploaded = new Set(
        documents.map((doc) =>
            doc.type === 'circulation_permit' ? 'sctr' : doc.type,
        ),
    );

    const types = checklist.map((option) => ({
        value: option.value,
        label: option.label,
        uploaded: uploaded.has(option.value),
    }));

    const done = types.filter((item) => item.uploaded).length;
    const total = types.length || 6;

    return {
        done,
        total,
        percent: total > 0 ? Math.round((done / total) * 100) : 0,
        types,
    };
}

export function UnitDocumentsModal({
    open,
    unit,
    documentTypes,
    onClose,
}: Props) {
    const { can } = useCan();
    const canManage = can('units.update');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [type, setType] = useState('soat');
    const [title, setTitle] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const documents = unit?.documents ?? [];
    const progress = useMemo(
        () =>
            unit?.documents_progress
                ? {
                      ...unit.documents_progress,
                      types:
                          unit.documents_progress.types ??
                          computeProgress(documents, documentTypes).types,
                  }
                : computeProgress(documents, documentTypes),
        [documents, documentTypes, unit?.documents_progress],
    );

    const latestByType = useMemo(() => {
        const map = new Map<string, UnitDocumentItem>();

        for (const doc of documents) {
            const key =
                doc.type === 'circulation_permit' ? 'sctr' : doc.type;
            if (!map.has(key)) {
                map.set(key, doc);
            }
        }

        return map;
    }, [documents]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const uploaded = new Set(
            (unit?.documents ?? []).map((doc) =>
                doc.type === 'circulation_permit' ? 'sctr' : doc.type,
            ),
        );
        const requiredTypes = documentTypes.filter((item) => item.required);
        const firstMissing =
            requiredTypes.find((item) => !uploaded.has(item.value))?.value ??
            documentTypes[0]?.value ??
            'soat';

        setType(firstMissing);
        setTitle('');
        setExpiresAt('');
        setFile(null);
        setError(null);
        setUploading(false);
        setDeletingId(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [open, unit?.id, documentTypes, unit?.documents]);

    const handleClose = () => {
        if (uploading || deletingId !== null) {
            return;
        }

        onClose();
    };

    const handleUpload = (event: FormEvent) => {
        event.preventDefault();

        if (!unit || !canManage || uploading) {
            return;
        }

        if (!file) {
            setError('Selecciona un archivo (foto o PDF).');

            return;
        }

        setError(null);
        setUploading(true);

        const formData = new FormData();
        formData.append('type', type);
        formData.append('file', file);

        if (title.trim() !== '') {
            formData.append('title', title.trim());
        }

        if (expiresAt !== '' && type !== 'driver_dni') {
            formData.append('expires_at', expiresAt);
        }

        router.post(`/unidades/${unit.id}/documentos`, formData, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setTitle('');
                setExpiresAt('');
                setFile(null);

                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
            onError: (errors) => {
                setError(
                    errors.file ??
                        errors.type ??
                        errors.expires_at ??
                        'No se pudo subir el documento.',
                );
            },
            onFinish: () => setUploading(false),
        });
    };

    const handleDelete = (document: UnitDocumentItem) => {
        if (!unit || !canManage || deletingId !== null) {
            return;
        }

        setDeletingId(document.id);

        router.delete(`/unidades/${unit.id}/documentos/${document.id}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title="Documentos de la unidad"
            description={
                unit
                    ? `${unit.correlative}${unit.plate_number ? ` · ${unit.plate_number}` : ''} — 6 documentos obligatorios (licencia, DNI, SOAT, revisión, propiedad, SCTR).`
                    : 'Sube y descarga documentos del vehículo y del conductor.'
            }
            className="sm:max-w-2xl"
            bodyClassName="max-h-[70vh] overflow-y-auto"
            footer={
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white"
                >
                    Cerrar
                </Button>
            }
        >
            <div className="space-y-5">
                <div className="rounded-xl border border-[#d7e3f0] bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-[#1a2b4c]">
                            Avance de documentos
                        </p>
                        <span className="text-[11px] text-[#6b8ead]">
                            {progress.done} de {progress.total} obligatorios
                        </span>
                    </div>
                    <DocumentsProgressBar
                        progress={progress}
                        size="md"
                        showLabel
                    />

                    <div className="mt-3 overflow-hidden rounded-lg border border-[#e2eaf3]">
                        <table className="min-w-full text-left text-xs">
                            <thead className="bg-[#f1f5f9] text-[#5a7390]">
                                <tr>
                                    <th className="px-2.5 py-2 font-semibold">
                                        Documento
                                    </th>
                                    <th className="px-2.5 py-2 font-semibold">
                                        Estado
                                    </th>
                                    <th className="px-2.5 py-2 text-right font-semibold">
                                        Archivo
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {progress.types.map((item) => {
                                    const latest = latestByType.get(item.value);
                                    const expiry = latest
                                        ? getDocumentExpiryInfo(latest)
                                        : null;

                                    return (
                                        <tr
                                            key={item.value}
                                            className={cn(
                                                'border-t border-[#eef2f7]',
                                                expiry?.level === 'warning' &&
                                                    'bg-[#fbf8f1]',
                                                (expiry?.level === 'danger' ||
                                                    expiry?.level ===
                                                        'expired') &&
                                                    'bg-[#faf5f5]',
                                            )}
                                        >
                                            <td className="px-2.5 py-2 font-medium text-[#1a2b4c]">
                                                {item.label}
                                            </td>
                                            <td className="px-2.5 py-2">
                                                {item.uploaded ? (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="inline-flex items-center gap-1 text-emerald-700">
                                                            <CheckCircle2 className="size-3.5" />
                                                            Subido
                                                        </span>
                                                        {expiry ? (
                                                            <DocumentExpiryBadge
                                                                info={expiry}
                                                            />
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-amber-700">
                                                        <Circle className="size-3.5" />
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-2.5 py-2 text-right text-[#5a7390]">
                                                {latest ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="max-w-[8rem] truncate">
                                                            {latest.original_name}
                                                        </span>
                                                        <a
                                                            href={`/unidades/${unit?.id}/documentos/${latest.id}/descargar`}
                                                            className="inline-flex size-7 items-center justify-center rounded-md text-[#2e5a9e] hover:bg-[#e8f1fa]"
                                                            title="Descargar"
                                                        >
                                                            <Download className="size-3.5" />
                                                        </a>
                                                        {canManage ? (
                                                            <button
                                                                type="button"
                                                                disabled={
                                                                    deletingId ===
                                                                    latest.id
                                                                }
                                                                onClick={() =>
                                                                    handleDelete(
                                                                        latest,
                                                                    )
                                                                }
                                                                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                                aria-label={`Eliminar ${latest.original_name}`}
                                                            >
                                                                {deletingId ===
                                                                latest.id ? (
                                                                    <Spinner />
                                                                ) : (
                                                                    <Trash2 className="size-3.5" />
                                                                )}
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {canManage ? (
                    <form
                        onSubmit={handleUpload}
                        className="space-y-3 rounded-xl border border-[#d7e3f0] bg-[#f8fafc] p-3"
                    >
                        <p className="text-xs font-semibold text-[#1a2b4c]">
                            Subir documento
                        </p>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="grid gap-1.5">
                                <Label
                                    htmlFor="unit-doc-type"
                                    className="text-xs text-[#1a2b4c]"
                                >
                                    Tipo <span className="text-red-500">*</span>
                                </Label>
                                <select
                                    id="unit-doc-type"
                                    value={type}
                                    onChange={(event) => {
                                        const value = event.target.value;
                                        setType(value);
                                        if (value === 'driver_dni') {
                                            setExpiresAt('');
                                        }
                                    }}
                                    className="flex h-9 w-full cursor-pointer rounded-md border border-[#c5d5e6] bg-white px-3 text-sm text-[#1a2b4c] shadow-none outline-none focus-visible:border-[#2e5a9e] focus-visible:ring-[3px] focus-visible:ring-[#4a90e2]/35"
                                >
                                    {documentTypes.map((option) => (
                                        <option
                                            key={option.value}
                                            value={option.value}
                                        >
                                            {option.label}
                                            {option.required
                                                ? ''
                                                : option.value === 'other'
                                                  ? ' (opcional)'
                                                  : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {type !== 'driver_dni' ? (
                                <div className="grid gap-1.5">
                                    <Label
                                        htmlFor="unit-doc-expires"
                                        className="text-xs text-[#1a2b4c]"
                                    >
                                        Vence (opcional)
                                    </Label>
                                    <Input
                                        id="unit-doc-expires"
                                        type="date"
                                        value={expiresAt}
                                        onChange={(event) =>
                                            setExpiresAt(event.target.value)
                                        }
                                        className="h-9 border-[#c5d5e6] bg-white text-sm"
                                    />
                                </div>
                            ) : (
                                <div className="grid gap-1.5">
                                    <Label className="text-xs text-[#1a2b4c]">
                                        Vencimiento
                                    </Label>
                                    <p className="flex h-9 items-center text-xs text-[#6b8ead]">
                                        El DNI no requiere fecha de
                                        vencimiento.
                                    </p>
                                </div>
                            )}
                        </div>

                        {type === 'other' ? (
                            <div className="grid gap-1.5">
                                <Label
                                    htmlFor="unit-doc-title"
                                    className="text-xs text-[#1a2b4c]"
                                >
                                    Título
                                </Label>
                                <Input
                                    id="unit-doc-title"
                                    value={title}
                                    onChange={(event) =>
                                        setTitle(event.target.value)
                                    }
                                    placeholder="Ej. Certificado municipal"
                                    className="h-9 border-[#c5d5e6] bg-white text-sm"
                                />
                            </div>
                        ) : null}

                        <div className="grid gap-1.5">
                            <Label
                                htmlFor="unit-doc-file"
                                className="text-xs text-[#1a2b4c]"
                            >
                                Archivo (foto o PDF){' '}
                                <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                ref={fileInputRef}
                                id="unit-doc-file"
                                type="file"
                                accept="image/jpeg,image/png,image/webp,application/pdf,.pdf,.jpg,.jpeg,.png,.webp"
                                onChange={(event) => {
                                    setError(null);
                                    setFile(event.target.files?.[0] ?? null);
                                }}
                                className="h-9 cursor-pointer border-[#c5d5e6] bg-white text-sm file:mr-3 file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-[#2e5a9e]"
                            />
                            <p className="text-[11px] text-[#6b8ead]">
                                JPG, PNG, WEBP o PDF · máximo 10 MB
                            </p>
                            <InputError message={error ?? undefined} />
                        </div>

                        <Button
                            type="submit"
                            disabled={uploading || !file}
                            className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:opacity-50"
                        >
                            {uploading ? <Spinner /> : <Upload className="size-4" />}
                            Subir documento
                        </Button>
                    </form>
                ) : null}

                {documents.some((doc) => doc.type === 'other') ? (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-[#1a2b4c]">
                            Otros documentos
                        </p>
                        <ul className="space-y-2">
                            {documents
                                .filter((doc) => doc.type === 'other')
                                .map((document) => (
                                    <li
                                        key={document.id}
                                        className="flex items-start gap-2 rounded-xl border border-[#e2eaf3] bg-white p-2.5"
                                    >
                                        <div
                                            className={cn(
                                                'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg',
                                                isPdf(document)
                                                    ? 'bg-red-50 text-red-600'
                                                    : 'bg-[#e8f1fa] text-[#2e5a9e]',
                                            )}
                                        >
                                            {isPdf(document) ? (
                                                <FileText className="size-4" />
                                            ) : (
                                                <ImageIcon className="size-4" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-medium text-[#1a2b4c]">
                                                {document.title ||
                                                    document.original_name}
                                            </p>
                                            <p className="text-[11px] text-[#6b8ead]">
                                                {formatBytes(document.size)} ·{' '}
                                                {formatDate(document.created_at)}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-0.5">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                asChild
                                                className="size-8 cursor-pointer text-[#2e5a9e] hover:bg-[#e8f1fa]"
                                            >
                                                <a
                                                    href={`/unidades/${unit?.id}/documentos/${document.id}/descargar`}
                                                    title="Descargar"
                                                >
                                                    <Download className="size-3.5" />
                                                </a>
                                            </Button>
                                            {canManage ? (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={
                                                        deletingId ===
                                                        document.id
                                                    }
                                                    onClick={() =>
                                                        handleDelete(document)
                                                    }
                                                    className="size-8 cursor-pointer text-red-600 hover:bg-red-50"
                                                >
                                                    {deletingId ===
                                                    document.id ? (
                                                        <Spinner />
                                                    ) : (
                                                        <Trash2 className="size-3.5" />
                                                    )}
                                                </Button>
                                            ) : null}
                                        </div>
                                    </li>
                                ))}
                        </ul>
                    </div>
                ) : null}
            </div>
        </AppModal>
    );
}
