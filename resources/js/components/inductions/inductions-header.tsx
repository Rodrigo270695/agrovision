import {
    CheckCircle2,
    Clock3,
    Download,
    FileText,
    GraduationCap,
    LoaderCircle,
    Plus,
} from 'lucide-react';
import type React from 'react';
import { PageHeader } from '@/components/data-page';
import type { InductionStatsData } from '@/components/inductions/inductions-stats';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

type Props = {
    stats: InductionStatsData;
    exportHref: string;
    onCreate: () => void;
    onFormats?: () => void;
    onCreateType?: () => void;
    title?: string;
    description?: string;
    createLabel?: string;
    createTypeLabel?: string;
    leadingAction?: React.ReactNode;
};

export function InductionsHeader({
    stats,
    exportHref,
    onCreate,
    onFormats,
    onCreateType,
    title = 'Configuración de inducción',
    description = 'Programa charlas, jala conductores desde unidades y controla la asistencia.',
    createLabel = 'Nueva inducción',
    createTypeLabel = 'Nuevo tipo',
    leadingAction,
}: Props) {
    const { can } = useCan();

    return (
        <PageHeader
            title={title}
            description={description}
            stats={[
                {
                    label: 'Total',
                    value: stats.total,
                    variant: 'info',
                    icon: GraduationCap,
                },
                {
                    label: 'Programadas',
                    value: stats.scheduled,
                    variant: 'warning',
                    icon: Clock3,
                },
                {
                    label: 'En curso',
                    value: stats.in_progress,
                    variant: 'primary',
                    icon: LoaderCircle,
                },
                {
                    label: 'Cerradas',
                    value: stats.closed,
                    variant: 'success',
                    icon: CheckCircle2,
                },
            ]}
            action={
                <div className="flex flex-wrap items-center gap-2">
                    {leadingAction}
                    {can('inductions.view') ? (
                        <Button
                            type="button"
                            variant="outline"
                            asChild
                            className="cursor-pointer gap-2 border-[#1a2b4c] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                        >
                            <a href={exportHref}>
                                <Download className="size-4" />
                                <span className="hidden sm:inline">
                                    Descargar Excel
                                </span>
                                <span className="sm:hidden">Excel</span>
                            </a>
                        </Button>
                    ) : null}
                    {onFormats && can('inductions.update') ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onFormats}
                            className="cursor-pointer gap-2 border-[#1a2b4c] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                        >
                            <FileText className="size-4" />
                            Códigos
                        </Button>
                    ) : null}
                    {onCreateType && can('inductions.create') ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onCreateType}
                            className="cursor-pointer gap-2 border-[#1a2b4c] text-[#1a2b4c] hover:bg-[#e8f1fa]"
                        >
                            <Plus className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">{createTypeLabel}</span>
                            <span className="sm:hidden">Tipo</span>
                        </Button>
                    ) : null}
                    {can('inductions.create') ? (
                        <Button
                            type="button"
                            onClick={onCreate}
                            className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            <Plus className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">{createLabel}</span>
                            <span className="sm:hidden">Nueva</span>
                        </Button>
                    ) : null}
                </div>
            }
        />
    );
}
