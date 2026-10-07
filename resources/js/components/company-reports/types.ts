export type ReportTone = 'ok' | 'mid' | 'bad' | 'muted';

export type ReportFilters = {
    date_from: string | null;
    date_to: string | null;
    label: string;
};

export type QuotaRow = {
    user_id: number;
    name: string;
    email: string;
    daily_quota: number | null;
    today: number;
    period: number;
    days_met: number;
    days_with_work: number;
    tone: ReportTone;
};

export type InductionRow = {
    id: number;
    title: string;
    when: string;
    status: string;
    facilitator: string;
    cited: number;
    arrived: number;
    signed: number;
    absent: number;
    pending: number;
    arrived_percent: number;
    signed_percent: number;
    tone: ReportTone;
};

export type InspectorRow = {
    user_id: number;
    name: string;
    total: number;
    quota: number | null;
    days_met: number;
    days_with_work: number;
    avg_minutes: number | null;
    tone: ReportTone;
};

export type InspectionDetail = {
    id: number;
    plate: string;
    inspector: string;
    started: string;
    finished: string;
    minutes: number | null;
    duration: string;
    result: string;
    tone: ReportTone;
    first_at: string;
    first_finished: string;
    first_duration: string;
    first_result: string;
    first_tone: ReportTone;
    second_at: string;
    second_result: string;
    second_tone: ReportTone;
    status: string;
    status_tone: ReportTone;
};

export type DetailFilters = {
    inspector_id: number | null;
    status: 'all' | 'open' | 'first' | 'done';
    per_page: number;
};

export type DetailMeta = {
    current_page: number;
    last_page: number;
    per_page: number;
    from: number | null;
    to: number | null;
    total: number;
    path: string;
};

export type ReportSummary = {
    inspectors: number;
    with_quota: number;
    met_today: number;
    today_goal_percent: number;
    inspections: number;
    avg_minutes: number | null;
    sessions: number;
    cited: number;
    arrived: number;
    signed: number;
    absent: number;
    attendance_percent: number;
    signed_percent: number;
};
