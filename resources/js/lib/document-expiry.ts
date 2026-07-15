export type DocumentExpiryLevel =
    | 'none'
    | 'ok'
    | 'warning'
    | 'danger'
    | 'expired';

export type DocumentExpiryInfo = {
    level: DocumentExpiryLevel;
    daysLeft: number | null;
    label: string | null;
};

const NO_EXPIRY_TYPES = new Set(['driver_dni']);

function parseDateOnly(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());

    if (match) {
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        const date = new Date(year, month, day);

        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function todayLocal(): Date {
    const now = new Date();

    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function daysBetween(from: Date, to: Date): number {
    const ms = to.getTime() - from.getTime();

    return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Alertas de vencimiento:
 * - Sin fecha o DNI → sin alerta
 * - ≤ 20 días → ámbar
 * - ≤ 7 días → rojo
 * - Ya vencido → rojo (vencido)
 */
export function getDocumentExpiryInfo(input: {
    type?: string | null;
    expires_at?: string | null;
}): DocumentExpiryInfo {
    const type = input.type ?? '';

    if (NO_EXPIRY_TYPES.has(type) || !input.expires_at) {
        return { level: 'none', daysLeft: null, label: null };
    }

    const expires = parseDateOnly(input.expires_at);

    if (!expires) {
        return { level: 'none', daysLeft: null, label: null };
    }

    const daysLeft = daysBetween(todayLocal(), expires);

    if (daysLeft < 0) {
        const overdue = Math.abs(daysLeft);

        return {
            level: 'expired',
            daysLeft,
            label:
                overdue === 1
                    ? 'Venció hace 1 día'
                    : `Venció hace ${overdue} días`,
        };
    }

    if (daysLeft <= 7) {
        return {
            level: 'danger',
            daysLeft,
            label:
                daysLeft === 0
                    ? 'Vence hoy'
                    : daysLeft === 1
                      ? 'Vence en 1 día'
                      : `Vence en ${daysLeft} días`,
        };
    }

    if (daysLeft <= 20) {
        return {
            level: 'warning',
            daysLeft,
            label: `Vence en ${daysLeft} días`,
        };
    }

    return {
        level: 'ok',
        daysLeft,
        label: `Vence ${expires.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })}`,
    };
}

const LEVEL_RANK: Record<DocumentExpiryLevel, number> = {
    none: 0,
    ok: 1,
    warning: 2,
    danger: 3,
    expired: 4,
};

export function getWorstDocumentExpiry(
    documents: Array<{ type?: string | null; expires_at?: string | null }>,
): DocumentExpiryInfo {
    let worst: DocumentExpiryInfo = {
        level: 'none',
        daysLeft: null,
        label: null,
    };

    for (const document of documents) {
        const info = getDocumentExpiryInfo(document);

        if (LEVEL_RANK[info.level] > LEVEL_RANK[worst.level]) {
            worst = info;
        }
    }

    if (worst.level === 'warning') {
        return { ...worst, label: 'Doc. por vencer (≤20 días)' };
    }

    if (worst.level === 'danger') {
        return { ...worst, label: 'Doc. por vencer (≤7 días)' };
    }

    if (worst.level === 'expired') {
        return { ...worst, label: 'Documento vencido' };
    }

    return worst;
}

export function documentExpiryBadgeClass(level: DocumentExpiryLevel): string {
    switch (level) {
        case 'warning':
            return 'border-[#f0e0c0] bg-[#fbf6ea] text-[#8a6d3b]';
        case 'danger':
            return 'border-[#efd0d0] bg-[#faf0f0] text-[#9a5050]';
        case 'expired':
            return 'border-[#e8c4c4] bg-[#f7e8e8] text-[#8b3a3a]';
        case 'ok':
            return 'border-[#cfe0d4] bg-[#f2f8f4] text-[#4a7a5c]';
        default:
            return '';
    }
}

export function unitExpiryRowClass(level: DocumentExpiryLevel): string {
    switch (level) {
        case 'warning':
            return 'bg-[#fbf8f1]';
        case 'danger':
        case 'expired':
            return 'bg-[#faf5f5]';
        default:
            return '';
    }
}
