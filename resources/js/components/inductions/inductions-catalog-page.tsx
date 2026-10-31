import { usePage } from '@inertiajs/react';
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
import { InductionsHeader } from '@/components/inductions/inductions-header';
import type { InductionStatsData } from '@/components/inductions/inductions-stats';
import type { StatusOption } from '@/components/inductions/inductions-table';
import { useCan } from '@/hooks/use-can';

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
    const [formatsOpen, setFormatsOpen] = useState(false);

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
                onFormats={() => setFormatsOpen(true)}
                createLabel="Nueva sesión"
                description="Catálogo fijo de tipos. Abre paquetes para ver las sesiones por fecha y cargar asistentes."
            />
            <InductionFormatsModal
                open={formatsOpen}
                formats={formats}
                onClose={() => setFormatsOpen(false)}
            />

            <InductionCatalog catalog={catalog ?? []} />

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
