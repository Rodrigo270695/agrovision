import { useForm, usePage } from '@inertiajs/react';
import { Download, FileSpreadsheet, Upload } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
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
import type { FleetTab } from '@/components/fleet-data/fleet-data-page';
import type { PeriodOption } from '@/components/units/unit-form-fields';

type ImportResult = {
    tab?: FleetTab;
    imported: number;
    errors: Array<{ row: number; messages: string[] }>;
};

type Props = {
    open: boolean;
    tab: FleetTab;
    periodOptions: PeriodOption[];
    onClose: () => void;
};

type PageProps = {
    flash?: {
        fleet_import?: ImportResult | null;
    };
};

export function FleetImportModal({ open, tab, periodOptions, onClose }: Props) {
    const { flash } = usePage().props as PageProps;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState('');
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const form = useForm<{ period_id: string; file: File | null }>({
        period_id: '',
        file: null,
    });

    const importUrl =
        tab === 'rc' ? '/datos-flota/rc/importar' : '/datos-flota/gps/importar';
    const templateUrl =
        tab === 'rc'
            ? '/datos-flota/rc/plantilla'
            : '/datos-flota/gps/plantilla';
    const title = tab === 'rc' ? 'Importar Seguro RC' : 'Importar GPS';

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
        setImportResult(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, tab]);

    useEffect(() => {
        const result = flash?.fleet_import;
        if (!result || result.tab !== tab) {
            return;
        }

        setImportResult(result);
    }, [flash?.fleet_import, tab]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();

        if (!form.data.file || !form.data.period_id) {
            return;
        }

        form.post(importUrl, {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                if ((flash?.fleet_import?.errors?.length ?? 0) === 0) {
                    onClose();
                }
            },
        });
    };

    return (
        <AppModal open={open} onClose={onClose} title={title} size="md">
            <form className="space-y-4" onSubmit={handleSubmit}>
                <p className="text-sm text-muted-foreground">
                    El archivo diario es la verdad: las placas que no vengan
                    pasan a inactivas. Cada carga queda en el historial.
                </p>

                <div className="space-y-2">
                    <Label>Periodo</Label>
                    <Select
                        value={form.data.period_id}
                        onValueChange={(value) =>
                            form.setData('period_id', value)
                        }
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona periodo" />
                        </SelectTrigger>
                        <SelectContent>
                            {periodOptions.map((period) => (
                                <SelectItem
                                    key={period.id}
                                    value={String(period.id)}
                                >
                                    {period.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Archivo Excel</Label>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="gap-2"
                        >
                            <a href={templateUrl}>
                                <Download className="size-4" />
                                Plantilla
                            </a>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="gap-2"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="size-4" />
                            Elegir archivo
                        </Button>
                        <span className="text-xs text-muted-foreground">
                            {fileName || 'Sin archivo'}
                        </span>
                    </div>
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;
                            form.setData('file', file);
                            setFileName(file?.name ?? '');
                        }}
                    />
                </div>

                {importResult && importResult.errors.length > 0 ? (
                    <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900">
                        {importResult.errors.map((error) => (
                            <div key={error.row}>
                                <strong>Fila {error.row}:</strong>{' '}
                                {error.messages.join(' ')}
                            </div>
                        ))}
                    </div>
                ) : null}

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={form.processing || !form.data.file}
                        className="gap-2"
                    >
                        {form.processing ? (
                            <Spinner className="size-4" />
                        ) : (
                            <FileSpreadsheet className="size-4" />
                        )}
                        Importar
                    </Button>
                </div>
            </form>
        </AppModal>
    );
}
