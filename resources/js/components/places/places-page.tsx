import { router, usePage } from '@inertiajs/react';
import { Building2, MapPin, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PlaceDeleteModal } from '@/components/places/place-delete-modal';
import { PlaceFormModal } from '@/components/places/place-form-modal';
import { PlacesHeader } from '@/components/places/places-header';
import type { PlacesStatsData } from '@/components/places/places-header';
import { PlacesTable } from '@/components/places/places-table';
import type {
    PlaceItem,
    PlacesFilters,
    PlacesPagination,
} from '@/components/places/places-table';
import { SiteDeleteModal } from '@/components/places/site-delete-modal';
import { SiteFormModal } from '@/components/places/site-form-modal';
import { SitesTable } from '@/components/places/sites-table';
import type { SiteItem, SitesPagination } from '@/components/places/sites-table';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';
import { isBrowserOnline } from '@/lib/offline/ids';

type SelectedSite = {
    id: number;
    name: string;
};

type PlacesPageProps = {
    sites: SitesPagination;
    selectedSite: SelectedSite | null;
    places: PlacesPagination;
    stats: PlacesStatsData;
    siteFilters: PlacesFilters;
    filters: PlacesFilters;
};

export function PlacesPage() {
    const { sites, selectedSite, places, stats, siteFilters, filters } =
        usePage().props as unknown as PlacesPageProps;
    const { can } = useCan();
    const [siteFormOpen, setSiteFormOpen] = useState(false);
    const [editingSite, setEditingSite] = useState<SiteItem | null>(null);
    const [siteDeleteOpen, setSiteDeleteOpen] = useState(false);
    const [deletingSite, setDeletingSite] = useState<SiteItem | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState<PlaceItem | null>(null);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState<PlaceItem | null>(null);

    const placeCarry = useMemo(
        () => ({
            site: selectedSite?.id,
            sites_search: siteFilters.search || undefined,
            sites_sort: siteFilters.sort,
            sites_direction: siteFilters.direction,
            sites_per_page: siteFilters.per_page,
            sites_page: sites.current_page,
        }),
        [selectedSite?.id, siteFilters, sites.current_page],
    );

    const siteCarry = useMemo(
        () => ({
            site: selectedSite?.id,
            search: filters.search || undefined,
            sort: filters.sort,
            direction: filters.direction,
            per_page: filters.per_page,
            page: places.current_page,
        }),
        [filters, places.current_page, selectedSite?.id],
    );

    const selectSite = (site: SiteItem) => {
        if (String(site.id) === String(selectedSite?.id ?? '')) {
            return;
        }

        if (!isBrowserOnline()) {
            toast.info('Sin conexión. La sede se puede elegir al reconectar.');

            return;
        }

        router.get(
            '/lugares',
            {
                ...siteCarry,
                ...placeCarry,
                site: site.id,
                search: undefined,
                page: 1,
            },
            {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            },
        );
    };

    return (
        <div className="flex flex-1 flex-col gap-5 p-4 sm:p-6">
            <PlacesHeader stats={stats} />

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <Building2 className="size-4 shrink-0 text-[#2e5a9e]" />
                        <h2 className="text-sm font-semibold text-[#1a2b4c]">
                            Sedes
                        </h2>
                    </div>
                    {can('places.create') ? (
                        <Button
                            type="button"
                            onClick={() => {
                                setEditingSite(null);
                                setSiteFormOpen(true);
                            }}
                            className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                        >
                            <Plus className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">Nueva sede</span>
                            <span className="sm:hidden">Nueva</span>
                        </Button>
                    ) : null}
                </div>
                <SitesTable
                    sites={sites}
                    filters={siteFilters}
                    selectedId={selectedSite?.id ?? null}
                    carry={siteCarry}
                    onSelect={selectSite}
                    onEdit={(site) => {
                        setEditingSite(site);
                        setSiteFormOpen(true);
                    }}
                    onDelete={(site) => {
                        setDeletingSite(site);
                        setSiteDeleteOpen(true);
                    }}
                />
            </section>

            <section className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <MapPin className="size-4 shrink-0 text-[#2e5a9e]" />
                        <h2 className="truncate text-sm font-semibold text-[#1a2b4c]">
                            {selectedSite
                                ? `Lugares de ${selectedSite.name}`
                                : 'Lugares'}
                        </h2>
                    </div>
                    {can('places.create') ? (
                        <Button
                            type="button"
                            disabled={!selectedSite}
                            onClick={() => {
                                if (!selectedSite) {
                                    return;
                                }

                                setEditing(null);
                                setFormOpen(true);
                            }}
                            className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Plus className="size-4" strokeWidth={2.5} />
                            <span className="hidden sm:inline">
                                Nuevo lugar
                            </span>
                            <span className="sm:hidden">Nuevo</span>
                        </Button>
                    ) : null}
                </div>
                <PlacesTable
                    places={places}
                    filters={filters}
                    carry={placeCarry}
                    locked={!selectedSite}
                    onEdit={(place) => {
                        setEditing(place);
                        setFormOpen(true);
                    }}
                    onDelete={(place) => {
                        setDeleting(place);
                        setDeleteOpen(true);
                    }}
                />
            </section>

            {can('places.create') || can('places.update') ? (
                <>
                    <SiteFormModal
                        open={siteFormOpen}
                        site={editingSite}
                        onClose={() => {
                            setSiteFormOpen(false);
                            setEditingSite(null);
                        }}
                    />
                    <PlaceFormModal
                        open={formOpen}
                        place={editing}
                        siteId={selectedSite?.id ?? null}
                        onClose={() => {
                            setFormOpen(false);
                            setEditing(null);
                        }}
                    />
                </>
            ) : null}

            {can('places.delete') ? (
                <>
                    <SiteDeleteModal
                        open={siteDeleteOpen}
                        site={deletingSite}
                        onClose={() => {
                            setSiteDeleteOpen(false);
                            setDeletingSite(null);
                        }}
                    />
                    <PlaceDeleteModal
                        open={deleteOpen}
                        place={deleting}
                        onClose={() => {
                            setDeleteOpen(false);
                            setDeleting(null);
                        }}
                    />
                </>
            ) : null}
        </div>
    );
}
