import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle,
    Bus,
    Building2,
    ClipboardCheck,
    FileStack,
    GraduationCap,
    Percent,
    TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type DashboardKpi = {
    key: string;
    label: string;
    value: string | number;
    hint: string;
    tone: string;
    href?: string;
};

const toneStyles: Record<string, string> = {
    blue: 'from-[#e8f1fa] to-white text-[#1a2b4c] border-[#cfe0f0]',
    teal: 'from-[#e8f5f1] to-white text-[#1a4a3c] border-[#c5e0d6]',
    indigo: 'from-[#eceef8] to-white text-[#2f3a6d] border-[#d0d5ec]',
    green: 'from-[#eaf6ee] to-white text-[#1f5a38] border-[#c8e2d2]',
    rose: 'from-[#f8eeee] to-white text-[#7a3b3b] border-[#e5cccc]',
    amber: 'from-[#f8f3e8] to-white text-[#6d5420] border-[#e6dcc0]',
    violet: 'from-[#f1eef8] to-white text-[#4c3a78] border-[#d9d0ea]',
    slate: 'from-[#f1f4f7] to-white text-[#445468] border-[#d5dde6]',
};

const icons: Record<string, LucideIcon> = {
    units: Bus,
    docs: FileStack,
    inspections: ClipboardCheck,
    pass_rate: Percent,
    expiring: AlertTriangle,
    inductions: GraduationCap,
    providers: Building2,
    without_plate: TriangleAlert,
};

type Props = {
    kpi: DashboardKpi;
};

export function DashboardKpiCard({ kpi }: Props) {
    const Icon = icons[kpi.key] ?? Bus;
    const content = (
        <div
            className={cn(
                'group relative overflow-hidden rounded-2xl border bg-linear-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                toneStyles[kpi.tone] ?? toneStyles.blue,
            )}
        >
            <div className="mb-3 flex items-start justify-between gap-2">
                <div className="rounded-xl bg-white/70 p-2 shadow-sm ring-1 ring-black/5">
                    <Icon className="size-4" />
                </div>
                {kpi.href ? (
                    <span className="text-[10px] font-medium tracking-wide text-current/50 uppercase opacity-0 transition group-hover:opacity-100">
                        Ver →
                    </span>
                ) : null}
            </div>
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {kpi.value}
            </p>
            <p className="mt-1 text-sm font-medium">{kpi.label}</p>
            <p className="mt-0.5 text-xs text-current/60">{kpi.hint}</p>
        </div>
    );

    if (!kpi.href) {
        return content;
    }

    return (
        <Link href={kpi.href} className="block cursor-pointer">
            {content}
        </Link>
    );
}
