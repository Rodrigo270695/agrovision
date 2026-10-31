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
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
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

            <InductionCatalog
                catalog={catalog ?? []}
                onDeleteType={can('inductions.delete') ? deleteType : undefined}
            />

            <InductionTypeFormModal
                open={typeFormOpen}
                activityOptions={formOptions?.activities ?? []}
                onClose={() => setTypeFormOpen(false)}
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
        </div>
    );
}
