import {
    Bus,
    Construction,
    LogIn,
    MapPinOff,
    ShieldAlert,
    Timer,
    TriangleAlert,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Props = {
    status: number;
};

function sceneFor(status: number): {
    Icon: LucideIcon;
    accent: string;
    roadLabel: string;
} {
    if (status === 404) {
        return {
            Icon: MapPinOff,
            accent: 'text-amber-300',
            roadLabel: 'Fuera de ruta',
        };
    }

    if (status === 403) {
        return {
            Icon: ShieldAlert,
            accent: 'text-rose-300',
            roadLabel: 'Acceso restringido',
        };
    }

    if (status === 401 || status === 419) {
        return {
            Icon: LogIn,
            accent: 'text-sky-300',
            roadLabel: 'Control de acceso',
        };
    }

    if (status === 503) {
        return {
            Icon: Construction,
            accent: 'text-amber-200',
            roadLabel: 'Obra en pista',
        };
    }

    if (status === 429) {
        return {
            Icon: Timer,
            accent: 'text-slate-200',
            roadLabel: 'Espera en garita',
        };
    }

    if (status >= 500) {
        return {
            Icon: Wrench,
            accent: 'text-amber-200',
            roadLabel: 'Parada técnica',
        };
    }

    return {
        Icon: TriangleAlert,
        accent: 'text-sky-200',
        roadLabel: 'Aviso en ruta',
    };
}

export function ErrorFleetScene({ status }: Props) {
    const { Icon, accent, roadLabel } = sceneFor(status);

    return (
        <div
            className="relative mx-auto mb-6 w-full max-w-sm"
            aria-hidden
        >
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 px-4 pb-6 pt-5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-[10px] font-semibold tracking-[0.2em] text-white/50 uppercase">
                    <span>Agrovisión</span>
                    <span>{roadLabel}</span>
                </div>

                <svg
                    className="mt-4 w-full text-white/25"
                    viewBox="0 0 320 56"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M8 40 C60 28, 120 48, 180 34 C230 22, 270 30, 312 26"
                        stroke="currentColor"
                        strokeWidth="6"
                        strokeLinecap="round"
                    />
                    <path
                        d="M8 40 C60 28, 120 48, 180 34 C230 22, 270 30, 312 26"
                        stroke="#fbbf24"
                        strokeWidth="2"
                        strokeDasharray="10 14"
                        strokeLinecap="round"
                        opacity="0.85"
                    />
                </svg>

                <div className="relative -mt-3 flex items-end justify-between px-2">
                    <div className="flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-brand-800/80 shadow-lg">
                        <Bus className="size-7 text-sky-200" strokeWidth={1.75} />
                    </div>
                    <div
                        className={`flex size-16 items-center justify-center rounded-2xl border border-white/20 bg-white/10 shadow-inner ${accent}`}
                    >
                        <Icon className="size-8" strokeWidth={1.75} />
                    </div>
                </div>
            </div>

            <p className="mt-2 text-center text-[11px] font-medium tracking-wide text-sky-100/70">
                Flota · inspecciones · campo
            </p>
        </div>
    );
}