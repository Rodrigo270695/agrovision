import { router, usePage } from '@inertiajs/react';
import { ClipboardPen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppModal } from '@/components/shared/app-modal';
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
    inspector_name?: string | null;
};

type ApprovalProps = {
    count: number;
    items: ApprovalItem[];
};

const SESSION_KEY = 'inspection-approvals-modal-seen-count';

function ApprovalList({
    items,
    emptyLabel = 'No hay solicitudes pendientes.',
}: {
    items: ApprovalItem[];
    emptyLabel?: string;
}) {
    if (items.length === 0) {
        return <p className="mt-3 text-xs text-muted-foreground">{emptyLabel}</p>;
    }

    return (
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
            {items.map((item) => {
                const requester =
                    item.requester_name?.trim() ||
                    item.inspector_name?.trim() ||
                    'Inspector';

                return (
                    <li
                        key={item.id}
                        className="rounded-xl border border-brand-200 bg-brand-50/40 px-3 py-2.5"
                    >
                        <p className="text-xs font-semibold text-brand-800">
                            {item.plate_number || 'Sin placa'} · {item.pass}{' '}
                            inspección
                        </p>
                        <p className="mt-1.5 text-[11px] leading-snug text-brand-700">
                            <span className="text-muted-foreground">
                                Inspector solicitante:{' '}
                            </span>
                            <span className="font-semibold text-brand-800">
                                {requester}
                            </span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Pide autorización para editar esta inspección.
                        </p>
                        {item.driver_name ? (
                            <p className="mt-0.5 text-[11px] text-muted-foreground">
                                Conductor: {item.driver_name}
                            </p>
                        ) : null}
                        <div className="mt-2.5 flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                className="h-8 flex-1 cursor-pointer bg-emerald-700 text-xs text-white hover:bg-emerald-800"
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
                                className="h-8 flex-1 cursor-pointer border-red-200 text-xs text-red-700 hover:bg-red-50"
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
                );
            })}
        </ul>
    );
}

export function InspectionEditApprovals() {
    const { can } = useCan();
    const approvals = (
        usePage().props as { inspectionApprovals?: ApprovalProps }
    ).inspectionApprovals;
    const [welcomeOpen, setWelcomeOpen] = useState(false);

    const count = approvals?.count ?? 0;
    const items = approvals?.items ?? [];
    const allowed = can('checklists.authorize_edit');

    useEffect(() => {
        if (!allowed || count <= 0) {
            setWelcomeOpen(false);
            return;
        }

        try {
            const seen = Number(sessionStorage.getItem(SESSION_KEY) ?? '0');
            if (count > seen) {
                setWelcomeOpen(true);
            }
        } catch {
            setWelcomeOpen(true);
        }
    }, [allowed, count]);

    const dismissWelcome = () => {
        try {
            sessionStorage.setItem(SESSION_KEY, String(count));
        } catch {
            // ignore
        }
        setWelcomeOpen(false);
    };

    if (!allowed) {
        return null;
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="relative size-9 shrink-0 cursor-pointer text-muted-foreground hover:bg-brand-100 hover:text-brand-700"
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
                <DropdownMenuContent align="end" className="w-80 bg-white p-3">
                    <p className="text-sm font-medium text-brand-700">
                        Ediciones por aprobar
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        El inspector solo puede corregir la inspección que
                        autorices.
                    </p>
                    <ApprovalList items={items} />
                </DropdownMenuContent>
            </DropdownMenu>

            <AppModal
                open={welcomeOpen && count > 0}
                onClose={dismissWelcome}
                title="Solicitudes de edición pendientes"
                description={
                    count === 1
                        ? 'Hay 1 inspección esperando tu autorización para editar.'
                        : `Hay ${count} inspecciones esperando tu autorización para editar.`
                }
                className="sm:max-w-md"
                footer={
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={dismissWelcome}
                        >
                            Cerrar
                        </Button>
                        <Button
                            type="button"
                            className="cursor-pointer bg-brand-700 text-white hover:bg-brand-700"
                            onClick={dismissWelcome}
                        >
                            Entendido
                        </Button>
                    </div>
                }
            >
                <p className="text-sm text-muted-foreground">
                    Revisa y aprueba o rechaza cada solicitud. También puedes
                    hacerlo desde el icono del portapapeles en la barra
                    superior.
                </p>
                <ApprovalList items={items} />
            </AppModal>
        </>
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
                'Autorizaron la edición. Ya puedes corregir la inspección.',
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
                    className="relative size-9 shrink-0 cursor-pointer text-muted-foreground hover:bg-brand-100 hover:text-brand-700"
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
                <p className="text-sm font-medium text-brand-700">
                    {waiting ? 'Edición en espera' : 'Ya puedes editar'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    {waiting
                        ? 'Todavía no responden la solicitud.'
                        : 'Autorizaron estas inspecciones.'}
                </p>
                <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                    {approved.map((item) => (
                        <li
                            key={item.id}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2"
                        >
                            <p className="text-xs font-semibold text-brand-700">
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
                                className="mt-2 h-7 w-full cursor-pointer bg-brand-700 text-xs text-white hover:bg-brand-700"
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
                            <p className="text-xs font-semibold text-brand-700">
                                {item.plate_number || 'Sin placa'} ·{' '}
                                {item.pass_label} inspección
                            </p>
                            <p className="mt-0.5 text-[11px] text-amber-800">
                                Esperando autorización
                            </p>
                        </li>
                    ))}
                </ul>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
