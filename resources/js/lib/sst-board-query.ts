export type SstBoardFilters = {
    date_from: string | null;
    date_to: string | null;
    coordinator_id: number | null;
    inspector_id: number | null;
    vehicle_types: string[];
    template: string;
    inspection: 'actual' | 'first' | 'second';
};

export function sstBoardQueryParams(
    filters: SstBoardFilters,
): Record<string, string | number | string[] | undefined> {
    return {
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
        ...(!filters.date_from && !filters.date_to ? { all_dates: 1 } : {}),
        coordinator_id: filters.coordinator_id ?? undefined,
        inspector_id: filters.inspector_id ?? undefined,
        vehicle_types:
            filters.vehicle_types.length > 0
                ? filters.vehicle_types
                : undefined,
        template: filters.template,
        inspection: filters.inspection,
    };
}
