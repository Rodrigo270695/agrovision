import { useForm, usePage } from '@inertiajs/react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { PeriodOption } from '@/components/units/unit-form-fields';
import { AppModal } from '@/components/shared/app-modal';
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

export type UnitImportError = {
    row: number;
    messages: string[];
};

type UnitImportResult = {
    imported: number;
    errors: UnitImportError[];
};

type Props = {
    open: boolean;
    periodOptions: PeriodOption[];
    onClose: () => void;
};

type PageProps = {
    flash?: {
        unit_import?: UnitImportResult | null;
    };
};

export function UnitImportModal({ open, periodOptions, onClose }: Props) {
    const { flash } = usePage().props as PageProps;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const [importResult, setImportResult] = useState<UnitImportResult | null>(
        null,
    );

    const form = useForm<{
        period_id: string;
        file: File | null;
    }>({
        period_id: '',
        file: null,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        const active = periodOptions.find((item) => item.status === 'active');
        form.setData({
            period_id: active
                ? String(active.id)
                : periodOptions[0]
                  ? String(periodOptions[0].id)
                  : '',
            file: null,
        });
        form.clearErrors();
        setFileName('');

        if (flash?.unit_import) {
            setImportResult(flash.unit_import);
        } else {
            setImportResult(null);
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, periodOptions]);

    useEffect(() => {
        if (flash?.unit_import) {
            setImportResult(flash.unit_import);
        }
    }, [flash?.unit_import]);

    const handleClose = () => {
        if (form.processing) {
            return;
        }

        form.reset();
        form.clearErrors();
        setFileName('');
        setImportResult(null);
        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!form.data.period_id || !form.data.file) {
            return;
        }

        form.post('/unidades/importar', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                form.setData('file', null);
                setFileName('');

                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            },
        });
    };

    const canSubmit =
        form.data.period_id.length > 0 &&
        Boolean(form.data.file) &&
        !form.processing;

    const periodSelectValue =
        form.data.period_id !== ''
            ? form.data.period_id
            : periodOptions[0]
              ? String(periodOptions[0].id)
              : 'none';

    return (
        <AppModal
            open={open}
            onClose={handleClose}
            title="Importar unidades"
            description="Descarga la plantilla, completa los datos y súbela en formato .xlsx."
            className="sm:max-w-xl"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={form.processing}
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white"
                    >
                        Cerrar
                    </Button>
                    <Button
                        type="submit"
                        form="unit-import-form"
                        disabled={!canSubmit}
                        className="cursor-pointer bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {form.processing ? <Spinner /> : null}
                        Importar Excel
                    </Button>
                </>
            }
        >
            <div className="space-y-4">
                <div className="rounded-xl border border-[#d7e3f0] bg-[#f8fafc] p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1a2b4c]">
                        <Download className="size-4 text-[#2e5a9e]" />
                        Descargar plantilla
                    </div>
                    <p className="mb-3 text-xs text-[#5a7390]">
                        Incluye las columnas del Excel. Campos obligatorios con
                        asterisco (*). Fecha en formato{' '}
                        <strong>dd/mm/yyyy</strong>.
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        asChild
                        className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c] hover:bg-white"
                    >
                        <a href="/unidades/plantilla">
                            <FileSpreadsheet className="size-4" />
                            Descargar plantilla.xlsx
                        </a>
                    </Button>
                </div>

                <form
                    id="unit-import-form"
                    onSubmit={handleSubmit}
                    className="space-y-3"
                >
                    <div className="grid gap-1.5">
                        <Label className="text-xs text-[#1a2b4c]">
                            Periodo destino <span className="text-red-500">*</span>
                        </Label>
                        <Select
                            value={periodSelectValue}
                            onValueChange={(value) => {
                                if (value === 'none') {
                                    return;
                                }

                                form.setData('period_id', value);
                            }}
                        >
                            <SelectTrigger className="h-10 w-full cursor-pointer border-[#c5d5e6] bg-white text-[#1a2b4c]">
                                <SelectValue placeholder="Selecciona periodo" />
                            </SelectTrigger>
                            <SelectContent className="border-[#d7e3f0] bg-white">
                                {periodOptions.length === 0 ? (
                                    <SelectItem value="none" disabled>
                                        No hay periodos
                                    </SelectItem>
                                ) : (
                                    periodOptions.map((period) => (
                                        <SelectItem
                                            key={period.id}
                                            value={String(period.id)}
                                            className="cursor-pointer"
                                        >
                                            {period.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {form.errors.period_id ? (
                            <p className="text-xs text-red-600">
                                {form.errors.period_id}
                            </p>
                        ) : null}
                    </div>

                    <div className="grid gap-1.5">
                        <Label
                            htmlFor="unit-import-file"
                            className="text-xs text-[#1a2b4c]"
                        >
                            Subir plantilla (.xlsx){' '}
                            <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center gap-2 rounded-lg border border-dashed border-[#c5d5e6] bg-white px-3 py-2.5">
                            <Upload className="size-4 shrink-0 text-[#2e5a9e]" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-[#1a2b4c]">
                                    {fileName || 'Ningún archivo seleccionado'}
                                </p>
                            </div>
                            <Input
                                ref={fileInputRef}
                                id="unit-import-file"
                                type="file"
                                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                className="max-w-[9.5rem] cursor-pointer border-0 p-0 text-xs shadow-none file:mr-2 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#e8f1fa] file:px-2 file:py-1 file:text-[#1a2b4c]"
                                onChange={(event) => {
                                    const file =
                                        event.target.files?.[0] ?? null;
                                    form.setData('file', file);
                                    setFileName(file?.name ?? '');
                                    setImportResult(null);
                                }}
                            />
                        </div>
                        {form.errors.file ? (
                            <p className="text-xs text-red-600">
                                {form.errors.file}
                            </p>
                        ) : null}
                    </div>
                </form>

                <div className="rounded-lg bg-[#f8fafc] px-3 py-2 text-[11px] text-[#5a7390]">
                    <p className="font-medium text-[#1a2b4c]">
                        Columnas de la plantilla
                    </p>
                    <p className="mt-1 leading-relaxed">
                        CORRELATIVO*, Celular, PROVEEDOR*, RUTA, T. VEHÍCULO,
                        FECHA (dd/mm/yyyy), CONDUCTOR, PLACA, RESPONSABLE, TIPO
                        DE SERVICIO, RUC, DNI CONDUCTOR, CATEGORIA, COORDINADOR,
                        CORREO
                    </p>
                </div>

                {importResult && importResult.errors.length > 0 ? (
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-red-200 bg-red-50 p-3">
                        <p className="text-xs font-semibold text-red-700">
                            Errores encontrados (
                            {importResult.errors.length} fila
                            {importResult.errors.length === 1 ? '' : 's'})
                        </p>
                        {importResult.errors.map((error) => (
                            <div
                                key={`${error.row}-${error.messages.join('-')}`}
                                className="rounded-md bg-white px-2.5 py-2 text-xs text-red-700 ring-1 ring-red-100"
                            >
                                <p className="font-semibold">
                                    Fila {error.row}
                                </p>
                                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                    {error.messages.map((message) => (
                                        <li key={message}>{message}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                ) : null}

                {importResult &&
                importResult.imported > 0 &&
                importResult.errors.length === 0 ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                        Se importaron {importResult.imported} unidades
                        correctamente.
                    </div>
                ) : null}
            </div>
        </AppModal>
    );
}
