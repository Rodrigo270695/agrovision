import { Download, FileText, Plus } from 'lucide-react';
import type React from 'react';
import type { InductionStatsData } from '@/components/inductions/inductions-stats';
import {
    PlatformHero,
    PlatformToolbar,
} from '@/components/platform';
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
        <div className="flex flex-col gap-3">
            <PlatformHero
                eyebrow="Inducción · Campo"
                title={title}
                description={description}
                stats={[
                    { label: 'Total', value: stats.total, tone: 'navy' },
                    {
                        label: 'Programadas',
                        value: stats.scheduled,
                        tone: 'amber',
                    },
                    {
                        label: 'En curso',
                        value: stats.in_progress,
                        tone: 'sky',
                    },
                    {
                        label: 'Cerradas',
                        value: stats.closed,
                        tone: 'emerald',
                    },
                ]}
            />

            <PlatformToolbar>
                {leadingAction}
                {can('inductions.view') ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        asChild
                        className="cursor-pointer gap-1.5 rounded-xl border-slate-200 text-brand-800 hover:bg-slate-50"
                    >
                        <a href={exportHref}>
                            <Download className="size-3.5" />
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
                        size="sm"
                        onClick={onFormats}
                        className="cursor-pointer gap-1.5 rounded-xl border-slate-200 text-brand-800 hover:bg-slate-50"
                    >
                        <FileText className="size-3.5" />
                        Códigos
                    </Button>
                ) : null}
                {onCreateType && can('inductions.create') ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={onCreateType}
                        className="cursor-pointer gap-1.5 rounded-xl border-slate-200 text-brand-800 hover:bg-slate-50"
                    >
                        <Plus className="size-3.5" strokeWidth={2.5} />
                        <span className="hidden sm:inline">
                            {createTypeLabel}
                        </span>
                        <span className="sm:hidden">Tipo</span>
                    </Button>
                ) : null}
                {can('inductions.create') ? (
                    <Button
                        type="button"
                        size="sm"
                        onClick={onCreate}
                        className="cursor-pointer gap-1.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600"
                    >
                        <Plus className="size-3.5" strokeWidth={2.5} />
                        <span className="hidden sm:inline">{createLabel}</span>
                        <span className="sm:hidden">Nueva</span>
                    </Button>
                ) : null}
            </PlatformToolbar>
        </div>
    );
}
