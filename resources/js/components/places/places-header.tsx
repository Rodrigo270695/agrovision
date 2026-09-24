import { Building2, CheckCircle2, MapPin } from 'lucide-react';
import { PageHeader } from '@/components/data-page';

export type PlacesStatsData = {
    sites: number;
    sites_active: number;
    places: number;
    active: number;
    inactive: number;
    on_screen: number;
};

type Props = {
    stats: PlacesStatsData;
};

export function PlacesHeader({ stats }: Props) {
    return (
        <PageHeader
            title="Lugares"
            description="Crea una sede, selecciónala y luego registra sus lugares."
            stats={[
                {
                    label: 'Sedes',
                    value: stats.sites,
                    variant: 'info',
                    icon: Building2,
                },
                {
                    label: 'Sedes activas',
                    value: stats.sites_active,
                    variant: 'success',
                    icon: CheckCircle2,
                },
                {
                    label: 'Lugares',
                    value: stats.places,
                    variant: 'primary',
                    icon: MapPin,
                },
                {
                    label: 'Activos',
                    value: stats.active,
                    variant: 'success',
                    icon: CheckCircle2,
                },
            ]}
        />
    );
}
