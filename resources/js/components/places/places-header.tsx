import { CheckCircle2, MapPin, PauseCircle, Plus } from 'lucide-react';
import { PageHeader } from '@/components/data-page';
import { Button } from '@/components/ui/button';
import { useCan } from '@/hooks/use-can';

export type PlacesStatsData = {
    places: number;
    active: number;
    inactive: number;
    on_screen: number;
};

type Props = {
    stats: PlacesStatsData;
    onCreate: () => void;
};

export function PlacesHeader({ stats, onCreate }: Props) {
    const { can } = useCan();

    return (
        <PageHeader
            title="Lugares"
            description="Puntos donde trabajan coordinadores, inspectores y los tests de alcohómetro."
            stats={[
                {
                    label: 'Total',
                    value: stats.places,
                    variant: 'info',
                    icon: MapPin,
                },
                {
                    label: 'Activos',
                    value: stats.active,
                    variant: 'success',
                    icon: CheckCircle2,
                },
                {
                    label: 'Inactivos',
                    value: stats.inactive,
                    variant: 'muted',
                    icon: PauseCircle,
                },
                {
                    label: 'En pantalla',
                    value: stats.on_screen,
                    variant: 'primary',
                    icon: MapPin,
                },
            ]}
            action={
                can('places.create') ? (
                    <Button
                        type="button"
                        onClick={onCreate}
                        className="cursor-pointer gap-2 bg-[#1a2b4c] text-white hover:bg-[#122038]"
                    >
                        <Plus className="size-4" strokeWidth={2.5} />
                        <span className="hidden sm:inline">Nuevo lugar</span>
                        <span className="sm:hidden">Nuevo</span>
                    </Button>
                ) : null
            }
        />
    );
}
