import { AlertTriangle, Clock3 } from 'lucide-react';
import {
    documentExpiryBadgeClass,
    type DocumentExpiryInfo,
    type DocumentExpiryLevel,
} from '@/lib/document-expiry';
import { cn } from '@/lib/utils';

type Props = {
    info: DocumentExpiryInfo;
    className?: string;
    compact?: boolean;
};

function Icon({ level }: { level: DocumentExpiryLevel }) {
    if (level === 'warning') {
        return <Clock3 className="size-3 shrink-0" />;
    }

    if (level === 'danger' || level === 'expired') {
        return <AlertTriangle className="size-3 shrink-0" />;
    }

    return null;
}

export function DocumentExpiryBadge({
    info,
    className,
    compact = false,
}: Props) {
    if (
        info.level === 'none' ||
        info.level === 'ok' ||
        !info.label
    ) {
        return null;
    }

    return (
        <span
            className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium leading-tight',
                documentExpiryBadgeClass(info.level),
                className,
            )}
            title={info.label}
        >
            <Icon level={info.level} />
            <span className={cn(compact && 'truncate')}>{info.label}</span>
        </span>
    );
}
