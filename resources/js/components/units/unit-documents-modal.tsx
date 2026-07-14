import { Download, FileText, Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { UnitItem } from '@/components/units/units-table';
import { AppModal } from '@/components/shared/app-modal';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

export type UnitDocumentTypeOption = {
    value: string;
    label: string;
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

function typeLabel(
    type: string,
    documentTypes: UnitDocumentTypeOption[],
): string {
    return documentTypes.find((item) => item.value === type)?.label ?? type;
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

    const grouped = useMemo(() => {
        const map = new Map<string, UnitDocumentItem[]>();

        for (const doc of documents) {
            const list = map.get(doc.type) ?? [];
            list.push(doc);
            map.set(doc.type, list);
        }

        return documentTypes
            .map((option) => ({
                ...option,
                items: map.get(option.value) ?? [],
            }))
            .filter((group) => group.items.length > 0);
    }, [documents, documentTypes]);

    useEffect(() => {
        if (!open) {
            return;
        }

        setType(documentTypes[0]?.value ?? 'soat');
        setTitle('');
        setExpiresAt('');
        setFile(null);
        setError(null);
        setUploading(false);
        setDeletingId(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [open, unit?.id, documentTypes]);

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

        if (expiresAt !== '') {
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
                    ? `${unit.correlative}${unit.plate_number ? ` · ${unit.plate_number}` : ''} — licencia, SOAT, revisión técnica y más.`
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
                                <Label className="text-xs text-[#1a2b4c]">
                                    Tipo <span className="text-red-500">*</span>
                                </Label>
                                <Select value={type} onValueChange={setType}>
                                    <SelectTrigger className="h-9 w-full cursor-pointer border-[#c5d5e6] bg-white text-sm">
                                        <SelectValue placeholder="Tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="border-[#d7e3f0] bg-white">
                                        {documentTypes.map((option) => (
                                            <SelectItem
                                                key={option.value}
                                                value={option.value}
                                                className="cursor-pointer"
                                            >
                                                {option.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

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

                <div className="space-y-3">
                    <p className="text-xs font-semibold text-[#1a2b4c]">
                        Documentos cargados ({documents.length})
                    </p>

                    {documents.length === 0 ? (
                        <p className="rounded-xl border border-dashed border-[#d7e3f0] px-3 py-8 text-center text-sm text-[#6b8ead]">
                            Aún no hay documentos para esta unidad.
                        </p>
                    ) : (
                        grouped.map((group) => (
                            <section key={group.value} className="space-y-2">
                                <h4 className="text-[11px] font-semibold tracking-wide text-[#6b8ead] uppercase">
                                    {group.label}
                                </h4>
                                <ul className="space-y-2">
                                    {group.items.map((document) => (
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
                                                    {document.expires_at
                                                        ? ` · Vence ${formatDate(document.expires_at)}`
                                                        : ''}
                                                    {document.uploader?.name
                                                        ? ` · ${document.uploader.name}`
                                                        : ''}
                                                </p>
                                                {document.title ? (
                                                    <p className="truncate text-[11px] text-[#5a7390]">
                                                        {document.original_name}
                                                    </p>
                                                ) : null}
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
                                                        aria-label={`Descargar ${document.original_name}`}
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
                                                        aria-label={`Eliminar ${document.original_name}`}
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
                            </section>
                        ))
                    )}

                    {documents.length > 0 && grouped.length === 0 ? (
                        <ul className="space-y-2">
                            {documents.map((document) => (
                                <li
                                    key={document.id}
                                    className="flex items-center justify-between gap-2 rounded-xl border border-[#e2eaf3] p-2.5 text-sm"
                                >
                                    <span className="truncate text-[#1a2b4c]">
                                        {typeLabel(document.type, documentTypes)}:{' '}
                                        {document.original_name}
                                    </span>
                                    <a
                                        href={`/unidades/${unit?.id}/documentos/${document.id}/descargar`}
                                        className="text-[#2e5a9e] hover:underline"
                                    >
                                        Descargar
                                    </a>
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            </div>
        </AppModal>
    );
}
