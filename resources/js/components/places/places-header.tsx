import {
    PlatformHero,
} from '@/components/platform';

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
        <PlatformHero
            title="Lugares"
            description="Crea una sede, selecciónala y luego registra sus lugares."
            stats={[
                { label: 'Sedes', value: stats.sites, tone: 'navy' },
                {
                    label: 'Sedes activas',
                    value: stats.sites_active,
                    tone: 'emerald',
                },
                { label: 'Lugares', value: stats.places, tone: 'sky' },
                { label: 'Activos', value: stats.active, tone: 'emerald' },
            ]}
        />
    );
}
