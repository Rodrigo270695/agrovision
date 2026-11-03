import { useEffect, useState } from 'react';
import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import type { ChecklistTemplateOption } from '@/components/checklists/checklist-create-modal';
import type { ChecklistsFilters } from '@/components/checklists/checklists-table';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    templates: ChecklistTemplateOption[];
    filters: ChecklistsFilters;
    onClose: () => void;
};

function exportHref(filters: ChecklistsFilters, templateType: string): string {
    const params = new URLSearchParams();
    params.set('template_type', templateType);

    if (filters.search) {
        params.set('search', filters.search);
    }

    if (filters.status) {
        params.set('status', filters.status);
    }

    if (filters.date_from) {
        params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
        params.set('date_to', filters.date_to);
    }

    if (filters.inspector_id) {
        params.set('inspector_id', String(filters.inspector_id));
    }

    return `/inspecciones/exportar?${params.toString()}`;
}

export function ChecklistExportModal({
    open,
    templates,
    filters,
    onClose,
}: Props) {
    const [templateType, setTemplateType] = useState('');

    useEffect(() => {
        if (!open) {
            return;
        }

        const current = filters.template_type;
        const match = templates.find((item) => item.type === current);

        setTemplateType(match?.type ?? templates[0]?.type ?? '');
    }, [open, filters.template_type, templates]);

    const selected = templates.find((item) => item.type === templateType);

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title="Exportar inspecciones"
            description="Cada plantilla tiene sus propios ítems. El Excel sale solo con los de la que elijas, más sus observaciones."
            className="sm:max-w-md"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="cursor-pointer border-brand-300 text-brand-700 hover:bg-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        disabled={!selected}
                        onClick={() => {
                            if (!selected) {
                                return;
                            }

                            window.location.assign(
                                exportHref(filters, selected.type),
                            );
                            onClose();
                        }}
                        className="cursor-pointer bg-brand-700 text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Descargar
                    </Button>
                </>
            }
        >
            {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No hay plantillas de checklist activas.
                </p>
            ) : (
                <div className="grid gap-2">
                    {templates.map((template) => {
                        const active = template.type === templateType;
                        const label =
                            template.label || template.type.toUpperCase();

                        return (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => setTemplateType(template.type)}
                                className={cn(
                                    'cursor-pointer rounded-xl border px-3 py-2.5 text-left transition',
                                    active
                                        ? 'border-brand-700 bg-brand-100'
                                        : 'border-brand-200 bg-white hover:bg-[#f7fbff]',
                                )}
                            >
                                <span className="block text-sm font-semibold text-brand-700">
                                    {label}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                    Ítems y observaciones de {label}
                                </span>
                            </button>
                        );
                    })}
                    <p className="text-xs text-muted-foreground">
                        Respeta la búsqueda, el estado, el inspector y las
                        fechas que ya tienes en el listado.
                    </p>
                </div>
            )}
        </AppModal>
    );
}
