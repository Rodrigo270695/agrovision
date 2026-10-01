import { router, usePage } from '@inertiajs/react';
import { ClipboardPen } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCan } from '@/hooks/use-can';

type ApprovalItem = {
    id: number;
    pass: '1ra' | '2da';
    plate_number?: string | null;
    driver_name?: string | null;
    requester_name?: string | null;
};

type ApprovalProps = {
    count: number;
    items: ApprovalItem[];
};

export function InspectionEditApprovals() {
    const { isSuperAdmin } = useCan();
    const approvals = (
        usePage().props as { inspectionApprovals?: ApprovalProps }
    ).inspectionApprovals;

    if (!isSuperAdmin) {
        return null;
    }

    const count = approvals?.count ?? 0;
    const items = approvals?.items ?? [];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="relative size-9 shrink-0 cursor-pointer text-[#5a7390] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                    aria-label={
                        count > 0
                            ? `${count} solicitudes de edición por aprobar`
                            : 'Solicitudes de edición'
                    }
                >
                    <ClipboardPen className="size-4" />
                    {count > 0 ? (
                        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                            {count > 9 ? '9+' : count}
                        </span>
                    ) : null}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-80 bg-white p-3"
            >
                <p className="text-sm font-medium text-[#1a2b4c]">
                    Ediciones por aprobar
                </p>
                <p className="mt-1 text-xs text-[#5a7390]">
                    El inspector solo puede corregir la inspección que
                    autorices.
                </p>
                {items.length === 0 ? (
                    <p className="mt-3 text-xs text-[#5a7390]">
                        No hay solicitudes pendientes.
                    </p>
                ) : (
                    <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                        {items.map((item) => (
                            <li
                                key={item.id}
                                className="rounded-lg border border-[#d7e3f0] px-2.5 py-2"
                            >
                                <p className="text-xs font-semibold text-[#1a2b4c]">
                                    {item.plate_number || 'Sin placa'} ·{' '}
                                    {item.pass} inspección
                                </p>
                                <p className="mt-0.5 text-[11px] text-[#5a7390]">
                                    {item.requester_name || 'Inspector'}
                                    {item.driver_name
                                        ? ` · ${item.driver_name}`
                                        : ''}{' '}
                                    pide autorización
                                </p>
                                <div className="mt-2 flex gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        className="h-7 flex-1 cursor-pointer bg-emerald-700 text-xs text-white hover:bg-emerald-800"
                                        onClick={() =>
                                            router.post(
                                                `/inspecciones/solicitudes/${item.id}/aprobar`,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        Aprobar
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 flex-1 cursor-pointer border-red-200 text-xs text-red-700"
                                        onClick={() =>
                                            router.post(
                                                `/inspecciones/solicitudes/${item.id}/rechazar`,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        Rechazar
                                    </Button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

type GrantItem = {
    id: number;
    checklist_id: number;
    status: 'pending' | 'approved';
    pass: 'first' | 'second';
    pass_label: '1ra' | '2da';
    plate_number?: string | null;
    driver_name?: string | null;
};

export function InspectionEditGrants() {
    const { isSuperAdmin } = useCan();
    const grants = (
        usePage().props as { inspectionEditGrants?: { items?: GrantItem[] } }
    ).inspectionEditGrants;
    const items = grants?.items ?? [];
    const approved = items.filter((item) => item.status === 'approved');
    const pending = items.filter((item) => item.status === 'pending');
    const approvedCount = approved.length;
    const knownApproved = useRef<number | null>(null);

    useEffect(() => {
        if (isSuperAdmin || pending.length === 0) {
            return;
        }

        const timer = window.setInterval(() => {
            router.reload({
                only: ['inspectionEditGrants'],
                preserveState: true,
                preserveScroll: true,
            });
        }, 20000);

        return () => window.clearInterval(timer);
    }, [isSuperAdmin, pending.length]);

    useEffect(() => {
        if (isSuperAdmin) {
            return;
        }

        if (knownApproved.current !== null && approvedCount > knownApproved.current) {
            toast.success(
                'Un superadmin autorizó la edición. Ya puedes corregir la inspección.',
            );
        }

        knownApproved.current = approvedCount;
    }, [approvedCount, isSuperAdmin]);

    if (isSuperAdmin || items.length === 0) {
        return null;
    }

    const waiting = approvedCount === 0;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="relative size-9 shrink-0 cursor-pointer text-[#5a7390] hover:bg-[#e8f1fa] hover:text-[#1a2b4c]"
                    aria-label={
                        waiting
                            ? 'Solicitud de edición en espera'
                            : `${approvedCount} ediciones autorizadas`
                    }
                >
                    <ClipboardPen
                        className={
                            waiting ? 'size-4 text-amber-600' : 'size-4 text-emerald-700'
                        }
                    />
                    <span
                        className={
                            waiting
                                ? 'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white'
                                : 'absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold text-white'
                        }
                    >
                        {waiting
                            ? pending.length > 9
                                ? '9+'
                                : pending.length
                            : approvedCount > 9
                              ? '9+'
                              : approvedCount}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-white p-3">
                <p className="text-sm font-medium text-[#1a2b4c]">
                    {waiting ? 'Edición en espera' : 'Ya puedes editar'}
                </p>
                <p className="mt-1 text-xs text-[#5a7390]">
                    {waiting
                        ? 'Un superadmin todavía no responde la solicitud.'
                        : 'El superadmin autorizó estas inspecciones.'}
                </p>
                <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                    {approved.map((item) => (
                        <li
                            key={item.id}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2"
                        >
                            <p className="text-xs font-semibold text-[#1a2b4c]">
                                {item.plate_number || 'Sin placa'} ·{' '}
                                {item.pass_label} inspección
                            </p>
                            <p className="mt-0.5 text-[11px] text-emerald-800">
                                Autorizada
                                {item.driver_name ? ` · ${item.driver_name}` : ''}
                            </p>
                            <Button
                                type="button"
                                size="sm"
                                className="mt-2 h-7 w-full cursor-pointer bg-[#1a2b4c] text-xs text-white hover:bg-[#122038]"
                                onClick={() =>
                                    router.visit(
                                        `/inspecciones/${item.checklist_id}/editar?pass=${item.pass}`,
                                    )
                                }
                            >
                                Editar {item.pass_label}
                            </Button>
                        </li>
                    ))}
                    {pending.map((item) => (
                        <li
                            key={item.id}
                            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2"
                        >
                            <p className="text-xs font-semibold text-[#1a2b4c]">
                                {item.plate_number || 'Sin placa'} ·{' '}
                                {item.pass_label} inspección
                            </p>
                            <p className="mt-0.5 text-[11px] text-amber-800">
                                Esperando al superadmin
                            </p>
                        </li>
                    ))}
                </ul>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
