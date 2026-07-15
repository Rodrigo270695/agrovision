export type DashboardKpi = {
    key: string;
    label: string;
    value: string | number;
    hint: string;
    tone: string;
    href?: string;
    delta?: number | null;
    deltaLabel?: string | null;
};

export type SemaforoItem = {
    key: string;
    label: string;
    status: 'green' | 'amber' | 'red' | 'neutral' | string;
    value: string;
    detail: string;
};

export type ChartPoint = {
    label: string;
    value: number;
    color?: string;
    secondary?: number;
};

export type DashboardAlert = {
    unit_id: number;
    correlative: string;
    plate: string | null;
    type: string;
    type_label: string;
    expires_at: string;
    days_left: number;
    level: string;
};

export type DashboardCharts = {
    inspections: ChartPoint[];
    documents_expiry: ChartPoint[];
    vehicles: ChartPoint[];
    providers: ChartPoint[];
    units_trend: ChartPoint[];
    inductions: ChartPoint[];
    docs_progress: ChartPoint[];
    inspection_compare: ChartPoint[];
};

export type DashboardProps = {
    generatedAt: string;
    activePeriod: { id: number; name: string; date?: string | null } | null;
    kpis: DashboardKpi[];
    semaforos: SemaforoItem[];
    charts: DashboardCharts;
    comparisons: {
        this_month_units: number;
        prev_month_units: number;
        this_month_inspections: number;
        prev_month_inspections: number;
        docs_avg_percent: number;
        first_pass_rate: number | null;
        second_pass_rate: number | null;
    };
    inductionsSummary: {
        attended: number;
        registered: number;
    };
    alerts: DashboardAlert[];
};
