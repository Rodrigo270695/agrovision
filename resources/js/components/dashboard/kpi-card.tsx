import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import {
    AlertTriangle,
    ArrowDownRight,
    ArrowUpRight,
    Bus,
    Building2,
    ClipboardCheck,
    FileStack,
    GraduationCap,
    Minus,
    Percent,
    TriangleAlert,
} from 'lucide-react';
import type { DashboardKpi } from '@/components/dashboard/types';
import { cn } from '@/lib/utils';

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
    const delta = kpi.delta;
    const DeltaIcon =
        delta === null || delta === undefined || delta === 0
            ? Minus
            : delta > 0
              ? ArrowUpRight
              : ArrowDownRight;

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
                {typeof delta === 'number' ? (
                    <span
                        className={cn(
                            'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            delta > 0 && 'bg-emerald-50 text-emerald-700',
                            delta < 0 && 'bg-rose-50 text-rose-700',
                            delta === 0 && 'bg-slate-100 text-slate-600',
                        )}
                    >
                        <DeltaIcon className="size-3" />
                        {delta > 0 ? `+${delta}` : delta}
                    </span>
                ) : null}
            </div>
            <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
                {kpi.value}
            </p>
            <p className="mt-1 text-sm font-medium">{kpi.label}</p>
            <p className="mt-0.5 text-xs text-current/60">
                {kpi.deltaLabel ?? kpi.hint}
            </p>
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

type GridProps = {
    items: DashboardKpi[];
};

export function DashboardKpiGrid({ items }: GridProps) {
    if (items.length === 0) {
        return (
            <div className="rounded-2xl border border-dashed border-[#cfe0f0] bg-white/70 px-4 py-8 text-center text-sm text-[#6b8ead]">
                Sin KPI para mostrar. Verifica permisos y datos operativos.
            </div>
        );
    }

    return (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {items.map((kpi) => (
                <DashboardKpiCard key={kpi.key} kpi={kpi} />
            ))}
        </section>
    );
}
