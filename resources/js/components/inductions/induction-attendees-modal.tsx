import { AppModal } from '@/components/shared/app-modal';
import { Button } from '@/components/ui/button';
import type {
    InductionAttendeePreview,
    InductionItem,
} from '@/components/inductions/inductions-table';
import { cn } from '@/lib/utils';

type Props = {
    open: boolean;
    induction: InductionItem | null;
    onClose: () => void;
};

const statusTone: Record<string, string> = {
    registered: 'bg-slate-100 text-slate-700',
    attended: 'bg-emerald-50 text-emerald-800',
    absent: 'bg-red-50 text-red-700',
};

const statusLabel: Record<string, string> = {
    registered: 'Inscrito',
    attended: 'Asistió',
    absent: 'No asistió',
};

export function InductionAttendeesModal({ open, induction, onClose }: Props) {
    const attendees = induction?.attendees ?? [];
    const attended = attendees.filter((item) => item.status === 'attended');

    return (
        <AppModal
            open={open}
            onClose={onClose}
            title={
                induction
                    ? `Asistentes · ${induction.title}`
                    : 'Asistentes'
            }
            description={
                induction
                    ? `${attended.length} asistieron de ${attendees.length} registrados.`
                    : undefined
            }
            className="sm:max-w-lg"
            bodyClassName="max-h-[65vh]"
            footer={
                <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    className="cursor-pointer border-[#c5d5e6] text-[#1a2b4c]"
                >
                    Cerrar
                </Button>
            }
        >
            {attendees.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#6b8ead]">
                    Esta inducción aún no tiene conductores registrados.
                </p>
            ) : (
                <ul className="divide-y divide-[#eef2f7]">
                    {attendees.map((attendee: InductionAttendeePreview) => (
                        <li
                            key={attendee.id}
                            className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                        >
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-[#1a2b4c]">
                                    {attendee.driver_name || 'Sin nombre'}
                                </p>
                                <p className="mt-0.5 text-xs text-[#5a7390]">
                                    DNI {attendee.driver_dni || '—'}
                                    {attendee.plate_number
                                        ? ` · ${attendee.plate_number}`
                                        : ''}
                                </p>
                            </div>
                            <span
                                className={cn(
                                    'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium',
                                    statusTone[attendee.status] ??
                                        'bg-slate-100 text-slate-700',
                                )}
                            >
                                {statusLabel[attendee.status] ?? attendee.status}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </AppModal>
    );
}
