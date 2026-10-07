import { usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
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
import { usePendingPosts } from '@/lib/offline/use-pending-posts';

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
    const pendingPackages = usePendingPosts('/alcoholimetro');
    const localPackages = useMemo<AlcoholPackageItem[]>(
        () =>
            pendingPackages.map((item) => {
                const place = (placeOptions ?? []).find(
                    (option) => String(option.id) === String(item.body.place_id),
                );

                return {
                    id: item.id,
                    pending_sync: true,
                    title: String(item.body.title ?? ''),
                    session_date: String(item.body.session_date ?? ''),
                    notes: String(item.body.notes ?? ''),
                    place: place ? { id: place.id, name: place.name } : null,
                    status: 'open',
                    tests_count: 0,
                    positive_count: 0,
                    pending_count: 0,
                };
            }),
        [pendingPackages, placeOptions],
    );
    const mergedPackages = useMemo<AlcoholPackagesPagination>(() => {
        if (localPackages.length === 0) {
            return packages;
        }

        return {
            ...packages,
            data: [...localPackages, ...packages.data],
            total: packages.total + localPackages.length,
        };
    }, [localPackages, packages]);
    const mergedStats = useMemo(
        () => ({
            ...stats,
            total: stats.total + localPackages.length,
        }),
        [localPackages.length, stats],
    );

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <AlcoholTestsHeader
                stats={mergedStats}
                isCoordinatorView={coordinatorView}
                onCreate={() => {
                    if (canManage) {
                        setFormOpen(true);
                    }
                }}
            />

            <AlcoholPackagesTable
                packages={mergedPackages}
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
