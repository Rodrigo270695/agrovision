import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AlcoholPackageDeleteModal } from '@/components/alcohol-tests/alcohol-package-delete-modal';
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
    placeOptions: { id: number; name: string }[];
    defaultPlaceId?: number | null;
};

export function AlcoholTestsPage() {
    const {
        packages,
        stats,
        filters,
        isCoordinatorView,
        placeOptions,
        defaultPlaceId,
    } = usePage().props as unknown as PageProps;
    const { can } = useCan();
    const [formOpen, setFormOpen] = useState(false);
    const [deleting, setDeleting] = useState<AlcoholPackageItem | null>(null);
    const coordinatorView = Boolean(isCoordinatorView);
    const canManage = can('alcoholtests.create') && !coordinatorView;

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <AlcoholTestsHeader
                stats={stats}
                isCoordinatorView={coordinatorView}
                onCreate={() => {
                    if (canManage) {
                        setFormOpen(true);
                    }
                }}
            />

            <AlcoholPackagesTable
                packages={packages}
                filters={filters}
                isCoordinatorView={coordinatorView}
                canDelete={canManage}
                onDelete={setDeleting}
            />

            {canManage ? (
                <AlcoholPackageFormModal
                    open={formOpen}
                    places={placeOptions ?? []}
                    defaultPlaceId={defaultPlaceId}
                    onClose={() => setFormOpen(false)}
                />
            ) : null}

            {canManage ? (
                <AlcoholPackageDeleteModal
                    open={deleting !== null}
                    packageItem={deleting}
                    onClose={() => setDeleting(null)}
                />
            ) : null}
        </div>
    );
}

export type { AlcoholPackageItem };
