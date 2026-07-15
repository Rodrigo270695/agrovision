import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AlcoholPackageFormModal } from '@/components/alcohol-tests/alcohol-package-form-modal';
import { AlcoholTestsHeader } from '@/components/alcohol-tests/alcohol-tests-header';
import {
    AlcoholPackagesTable,
    type AlcoholPackageItem,
    type AlcoholPackagesFilters,
    type AlcoholPackagesPagination,
} from '@/components/alcohol-tests/alcohol-packages-table';
import { useCan } from '@/hooks/use-can';

type Stats = {
    total: number;
    tests: number;
    positive: number;
    pending: number;
};

type PageProps = {
    packages: AlcoholPackagesPagination;
    stats: Stats;
    filters: AlcoholPackagesFilters;
    isCoordinatorView?: boolean;
};

export function AlcoholTestsPage() {
    const { packages, stats, filters, isCoordinatorView } = usePage()
        .props as unknown as PageProps;
    const { can } = useCan();
    const [formOpen, setFormOpen] = useState(false);
    const coordinatorView = Boolean(isCoordinatorView);

    return (
        <div className="flex flex-col gap-4 p-4">
            <AlcoholTestsHeader
                stats={stats}
                isCoordinatorView={coordinatorView}
                onCreate={() => {
                    if (can('alcoholtests.create')) {
                        setFormOpen(true);
                    }
                }}
            />

            <AlcoholPackagesTable
                packages={packages}
                filters={filters}
                isCoordinatorView={coordinatorView}
            />

            {can('alcoholtests.create') ? (
                <AlcoholPackageFormModal
                    open={formOpen}
                    onClose={() => setFormOpen(false)}
                />
            ) : null}
        </div>
    );
}

export type { AlcoholPackageItem };
