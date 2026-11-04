import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import {
    InductionCatalog,
    type InductionCatalogItem,
} from '@/components/inductions/induction-catalog';
import {
    InductionFormatsModal,
    type InductionFormats,
} from '@/components/inductions/induction-formats-modal';
import { InductionFormModal } from '@/components/inductions/induction-form-modal';
import type { InductionFormOptions } from '@/components/inductions/induction-form-fields';
import type { PeriodOption } from '@/components/inductions/induction-form-fields';
import { InductionTypeFormModal } from '@/components/inductions/induction-type-form-modal';
import { InductionsHeader } from '@/components/inductions/inductions-header';
import type { InductionStatsData } from '@/components/inductions/inductions-stats';
import type { StatusOption } from '@/components/inductions/inductions-table';
import {
    PlatformContentPanel,
    PlatformPageShell,
} from '@/components/platform';
import { useCan } from '@/hooks/use-can';
import { toast } from 'sonner';

type PageProps = {
    catalog: InductionCatalogItem[];
    stats: InductionStatsData & { types?: number };
    periodOptions: PeriodOption[];
    statusOptions: StatusOption[];
    formOptions: InductionFormOptions;
    formats: InductionFormats;
};

export function InductionsCatalogPage() {
    const {
        catalog,
        stats,
        periodOptions,
        formOptions,
        formats,
    } = usePage().props as unknown as PageProps;
    const { can } = useCan();
    const [formOpen, setFormOpen] = useState(false);
    const [typeFormOpen, setTypeFormOpen] = useState(false);
    const [editingType, setEditingType] = useState<InductionCatalogItem | null>(
        null,
    );
    const [formatsOpen, setFormatsOpen] = useState(false);

    const deleteType = (item: InductionCatalogItem) => {
        if (!can('inductions.delete')) {
            return;
        }

        if (item.packages_count > 0) {
            toast.error(
                `No se puede eliminar: tiene ${item.packages_count} paquete(s).`,
            );

            return;
        }

        router.delete(`/inducciones/tipos/${item.slug}`, {
            preserveScroll: true,
        });
    };

    return (
        <PlatformPageShell>
            <InductionsHeader
                stats={stats}
                exportHref="/inducciones/exportar?all_dates=1"
                onCreate={() => {
                    if (!can('inductions.create')) {
                        return;
                    }

                    setFormOpen(true);
                }}
                onCreateType={() => {
                    if (!can('inductions.create')) {
                        return;
                    }

                    setEditingType(null);
                    setTypeFormOpen(true);
                }}
                onFormats={() => setFormatsOpen(true)}
                createLabel="Nueva sesión"
                createTypeLabel="Nuevo tipo"
                description="Catálogo de tipos. Crea un tipo nuevo si el nombre no existe; abre paquetes para sesiones por fecha."
            />
            <InductionFormatsModal
                open={formatsOpen}
                formats={formats}
                onClose={() => setFormatsOpen(false)}
            />

            <PlatformContentPanel className="p-3 sm:p-4">
                <InductionCatalog
                    catalog={catalog ?? []}
                    onEditType={
                        can('inductions.update')
                            ? (item) => {
                                  setEditingType(item);
                                  setTypeFormOpen(true);
                              }
                            : undefined
                    }
                    onDeleteType={
                        can('inductions.delete') ? deleteType : undefined
                    }
                />
            </PlatformContentPanel>

            <InductionTypeFormModal
                open={typeFormOpen}
                editing={editingType}
                catalog={catalog ?? []}
                activityOptions={formOptions?.activities ?? []}
                onClose={() => {
                    setTypeFormOpen(false);
                    setEditingType(null);
                }}
            />

            {can('inductions.create') ? (
                <InductionFormModal
                    open={formOpen}
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
                    onClose={() => setFormOpen(false)}
                />
            ) : null}
        </PlatformPageShell>
    );
}
