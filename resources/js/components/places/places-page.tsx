import { usePage } from '@inertiajs/react';
import { useState } from 'react';
import { PlaceDeleteModal } from '@/components/places/place-delete-modal';
import { PlaceFormModal } from '@/components/places/place-form-modal';
import { PlacesHeader, type PlacesStatsData } from '@/components/places/places-header';
import {
    PlacesTable,
    type PlaceItem,
    type PlacesFilters,
    type PlacesPagination,
} from '@/components/places/places-table';
import { useCan } from '@/hooks/use-can';

type PlacesPageProps = {
    places: PlacesPagination;
    stats: PlacesStatsData;
    filters: PlacesFilters;
};

export function PlacesPage() {
    const { places, stats, filters } = usePage()
        .props as unknown as PlacesPageProps;
    const { can } = useCan();
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<PlaceItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<PlaceItem | null>(null);

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <PlacesHeader
                stats={stats}
                onCreate={() => {
                    if (!can('places.create')) {
                        return;
                    }

                    setEditing(null);
                    setFormOpen(true);
                }}
            />
            <PlacesTable
                places={places}
                filters={filters}
                onEdit={(place) => {
                    setEditing(place);
                    setFormOpen(true);
                }}
                onDelete={(place) => {
                    setDeleting(place);
                    setDeleteOpen(true);
                }}
            />

            {can('places.create') || can('places.update') ? (
                <PlaceFormModal
                    open={formOpen}
                    place={editing}
                    onClose={() => {
                        setFormOpen(false);
                        setEditing(null);
                    }}
                />
            ) : null}

            {can('places.delete') ? (
                <PlaceDeleteModal
                    open={deleteOpen}
                    place={deleting}
                    onClose={() => {
                        setDeleteOpen(false);
                        setDeleting(null);
                    }}
                />
            ) : null}
        </div>
    );
}
