import { Link } from '@inertiajs/react';
import { AlertTriangle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const levelStyles: Record<string, string> = {
    warning: 'border-[#e6dcc0] bg-[#fbf7ee] text-[#8a6d3b]',
    danger: 'border-[#efd0d0] bg-[#faf0f0] text-[#9a5050]',
    expired: 'border-[#e8c4c4] bg-[#f7e8e8] text-[#8b3a3a]',
};

type Props = {
    alerts: DashboardAlert[];
};

export function DashboardAlertsList({ alerts }: Props) {
    return (
        <div className="rounded-2xl border border-[#d7e3f0] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-[#1a2b4c]">
                        Alertas documentales
                    </h3>
                    <p className="text-xs text-[#6b8ead]">
                        Vencidos o por vencer en ≤20 días (sin DNI)
                    </p>
                </div>
                <Link
                    href="/unidades"
                    className="text-xs font-medium text-[#2e5a9e] hover:underline"
                >
                    Ir a unidades
                </Link>
            </div>

            {alerts.length === 0 ? (
                <p className="rounded-xl bg-[#f4faf6] px-3 py-6 text-center text-sm text-[#3d8b6e]">
                    Sin alertas de vencimiento en la flota.
                </p>
            ) : (
                <ul className="space-y-2">
                    {alerts.map((alert) => (
                        <li
                            key={`${alert.unit_id}-${alert.type}-${alert.expires_at}`}
                            className={cn(
                                'flex items-start gap-3 rounded-xl border px-3 py-2.5',
                                levelStyles[alert.level] ?? levelStyles.warning,
                            )}
                        >
                            <span className="mt-0.5">
                                {alert.level === 'warning' ? (
                                    <Clock3 className="size-4" />
                                ) : (
                                    <AlertTriangle className="size-4" />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold">
                                    {alert.correlative}
                                    {alert.plate ? ` · ${alert.plate}` : ''}
                                </p>
                                <p className="text-xs opacity-90">
                                    {alert.type_label} · vence {alert.expires_at}
                                </p>
                            </div>
                            <span className="shrink-0 text-[11px] font-semibold">
                                {alert.days_left < 0
                                    ? `${Math.abs(alert.days_left)}d vencido`
                                    : alert.days_left === 0
                                      ? 'Hoy'
                                      : `${alert.days_left}d`}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
