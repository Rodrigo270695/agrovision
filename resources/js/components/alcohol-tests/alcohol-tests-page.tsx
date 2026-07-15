import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { AlcoholTestFormModal } from '@/components/alcohol-tests/alcohol-test-form-modal';
import { AlcoholTestsHeader } from '@/components/alcohol-tests/alcohol-tests-header';
import {
    AlcoholTestsTable,
    type AlcoholTestItem,
    type AlcoholTestsFilters,
    type AlcoholTestsPagination,
    type UnitOption,
} from '@/components/alcohol-tests/alcohol-tests-table';
import { useCan } from '@/hooks/use-can';

type Stats = {
    total: number;
    positive: number;
    pending: number;
    acknowledged: number;
};

type PageProps = {
    items: AlcoholTestsPagination;
    stats: Stats;
    filters: AlcoholTestsFilters;
    unitOptions: UnitOption[];
};

export function AlcoholTestsPage() {
    const { items, stats, filters, unitOptions } = usePage()
        .props as unknown as PageProps;
    const { can } = useCan();
    const [formOpen, setFormOpen] = useState(false);

    return (
        <div className="flex flex-col gap-4 p-4">
            <AlcoholTestsHeader
                stats={stats}
                onCreate={() => {
                    if (can('alcoholtests.create')) {
                        setFormOpen(true);
                    }
                }}
            />

            <AlcoholTestsTable items={items} filters={filters} />

            {can('alcoholtests.create') ? (
                <AlcoholTestFormModal
                    open={formOpen}
                    unitOptions={unitOptions ?? []}
                    onClose={() => setFormOpen(false)}
                />
            ) : null}
        </div>
    );
}

export type { AlcoholTestItem };
