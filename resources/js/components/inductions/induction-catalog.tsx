import {
    CheckCircle2,
    Clock3,
    GraduationCap,
    LoaderCircle,
    Package,
    Trash2,
} from 'lucide-react';
import { router } from '@inertiajs/react';
import { DataTable, EmptyState, type DataTableColumn } from '@/components/data-page';
import { RowActionsMenu } from '@/components/shared/row-actions-menu';

export type InductionCatalogItem = {
    slug: string;
    title: string;
    short: string;
    activity: string;
    activity_label: string;
    packages_count: number;
    scheduled: number;
    in_progress: number;
    closed: number;
    last_session_at?: string | null;
    last_session_date?: string | null;
    last_sede?: string | null;
    last_lugar?: string | null;
};

type Props = {
    catalog: InductionCatalogItem[];
    onDeleteType?: (item: InductionCatalogItem) => void;
};

function formatDate(value?: string | null): string {
    if (!value) {
        return 'Sin sesiones';
    }

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (match) {
        const date = new Date(
            Number(match[1]),
            Number(match[2]) - 1,
            Number(match[3]),
        );

        return date
            .toLocaleDateString('es-PE', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            })
            .replace(/\./g, '')
            .replace(/[\u00a0\u202f\u2009]/g, ' ');
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Sin sesiones';
    }

    return date
        .toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        .replace(/\./g, '')
        .replace(/[\u00a0\u202f\u2009]/g, ' ');
}

function openPackages(item: InductionCatalogItem) {
    router.visit(`/inducciones/tipos/${item.slug}`);
}

export function InductionCatalog({ catalog, onDeleteType }: Props) {
    const columns: DataTableColumn<InductionCatalogItem>[] = [
        {
            key: 'title',
            header: 'Tipo',
            cell: (item) => (
                <button
                    type="button"
                    onClick={() => openPackages(item)}
                    className="flex min-w-0 cursor-pointer flex-col text-left leading-tight"
                >
                    <span className="truncate text-sm font-semibold text-foreground">
                        {item.title}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                        {item.activity_label}
                    </span>
                </button>
            ),
        },
        {
            key: 'packages',
            header: 'Paquetes',
            cell: (item) => (
                <span className="text-sm font-medium text-[#1a2b4c]">
                    {item.packages_count}
                </span>
            ),
        },
        {
            key: 'status',
            header: 'Estado',
            cell: (item) => (
                <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3 text-[#2e5a9e]" />
                        {item.scheduled}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <LoaderCircle className="size-3 text-amber-600" />
                        {item.in_progress}
                    </span>
                    <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        {item.closed}
                    </span>
                </div>
            ),
        },
        {
            key: 'last',
            header: 'Último paquete',
            cell: (item) => (
                <div className="flex min-w-0 flex-col leading-tight">
                    <span className="text-xs text-muted-foreground">
                        {formatDate(item.last_session_date ?? item.last_session_at)}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                        {[item.last_sede, item.last_lugar].filter(Boolean).join(' · ') || '—'}
                    </span>
                </div>
            ),
        },
        {
            key: 'actions',
            header: '',
            cell: (item) => (
                <div className="flex items-center justify-end">
                    <RowActionsMenu
                        label={`Acciones de ${item.short}`}
                        items={[
                            {
                                key: 'packages',
                                label: 'Abrir paquetes',
                                icon: Package,
                                onSelect: () => openPackages(item),
                            },
                            onDeleteType
                                ? {
                                      key: 'delete',
                                      label: 'Eliminar tipo',
                                      icon: Trash2,
                                      tone: 'danger' as const,
                                      separatorBefore: true,
                                      onSelect: () => onDeleteType(item),
                                  }
                                : null,
                        ].filter((row): row is NonNullable<typeof row> => Boolean(row))}
                    />
                </div>
            ),
        },
    ];

    return (
        <DataTable
            columns={columns}
            data={catalog}
            rowKey={(item) => item.slug}
            emptyState={
                <EmptyState
                    icon={GraduationCap}
                    title="Sin tipos de inducción"
                    description="Crea el primer tipo con «Nuevo tipo»."
                />
            }
        />
    );
}
