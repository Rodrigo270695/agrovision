import { router, usePage } from '@inertiajs/react';
import { ClipboardPen } from 'lucide-react';
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
