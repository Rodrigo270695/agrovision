import { router, usePage } from '@inertiajs/react';
import { MessageCircle } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type InboxItem = {
    id: number;
    checklist_id: number;
    pass: 'first' | 'second';
    pass_label: string;
    plate_number?: string | null;
    driver_name?: string | null;
    kind: 'submitted' | 'rejected';
    status_label: string;
    date?: string | null;
    from_name?: string | null;
};

type InboxProps = {
    count: number;
    items: InboxItem[];
};

export function ObservationInbox() {
    const page = usePage();
    const inbox = (page.props as { observationInbox?: InboxProps })
        .observationInbox;
    const count = inbox?.count ?? 0;
    const items = inbox?.items ?? [];
    const knownCount = useRef<number | null>(null);

    useEffect(() => {
        const timer = window.setInterval(() => {
            router.reload({
                only: ['observationInbox'],
                preserveState: true,
                preserveScroll: true,
            });
        }, 15000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        if (knownCount.current !== null && count > knownCount.current) {
            toast.message('Nuevo mensaje de observaciones', {
                description: 'Revisa el buzón del header.',
            });
        }
        knownCount.current = count;
    }, [count]);

    if (inbox == null) {
        return null;
    }

    const hasMessages = count > 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={cn(
                        'relative size-9 shrink-0 cursor-pointer text-[#5a7390] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]',
                        hasMessages && 'text-[#1e4d8c]',
                    )}
                    aria-label={
                        hasMessages
                            ? `${count} mensajes de observaciones`
                            : 'Mensajes de observaciones'
                    }
                >
                    <MessageCircle
                        className={cn(
                            'size-4',
                            hasMessages &&
                                'animate-[obsBlink_1s_ease-in-out_infinite] text-[#1e4d8c]',
                        )}
                    />
                    {hasMessages ? (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 animate-[obsBlink_1s_ease-in-out_infinite] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                            {count > 9 ? '9+' : count}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-[min(22rem,calc(100vw-1.5rem))] bg-white p-3"
            >
                <p className="text-sm font-medium text-[#1a2b4c]">
                    Mensajes de observaciones
                </p>
                <p className="mt-1 text-xs text-[#5a7390]">
                    Levantamientos enviados o rechazados que requieren tu
                    atención.
                </p>

                {items.length === 0 ? (
                    <p className="mt-3 text-xs text-[#5a7390]">
                        No hay mensajes pendientes.
                    </p>
                ) : (
                    <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                        {items.map((item) => (
                            <li
                                key={item.id}
                                className={cn(
                                    'rounded-lg border px-2.5 py-2',
                                    item.kind === 'rejected'
                                        ? 'border-amber-200 bg-amber-50'
                                        : 'border-[#d7e3f0] bg-[#f7fbff]',
                                )}
                            >
                                <p className="text-xs font-semibold text-[#1a2b4c]">
                                    {item.plate_number || 'Sin placa'} ·{' '}
                                    {item.pass_label}
                                </p>
                                <p className="mt-0.5 text-[11px] text-[#5a7390]">
                                    {item.status_label}
                                    {item.from_name
                                        ? ` · ${item.from_name}`
                                        : ''}
                                    {item.driver_name
                                        ? ` · ${item.driver_name}`
                                        : ''}
                                </p>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="mt-2 h-7 w-full cursor-pointer bg-[#1a2b4c] text-xs text-white hover:bg-[#122038]"
                                    onClick={() => {
                                        const params = new URLSearchParams();
                                        if (item.date) {
                                            const [y, m] = item.date.split('-');
                                            params.set('year', y);
                                            params.set('month', String(Number(m)));
                                            params.set('date', item.date);
                                        }
                                        router.visit(
                                            `/calendario-observaciones?${params.toString()}`,
                                        );
                                    }}
                                >
                                    {item.kind === 'rejected'
                                        ? 'Reenviar levantamiento'
                                        : 'Revisar y verificar'}
                                </Button>
                            </li>
                        ))}
                    </ul>
                )}
            </DropdownMenuContent>
            <style>{`
                @keyframes obsBlink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.35; }
                }
                @media (prefers-reduced-motion: reduce) {
                    .animate-\\[obsBlink_1s_ease-in-out_infinite\\] {
                        animation: none !important;
                    }
                }
            `}</style>
        </DropdownMenu>
    );
}
