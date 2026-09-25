import {
    endOfMonth,
    endOfWeek,
    endOfYear,
    startOfDay,
    startOfMonth,
    startOfWeek,
    startOfYear,
    subDays,
    subMonths,
    subWeeks,
} from 'date-fns';

export function rangeToday(): { from: Date; to: Date } {
    const n = startOfDay(new Date());

    return { from: n, to: n };
}

export function rangeYesterday(): { from: Date; to: Date } {
    const n = startOfDay(subDays(new Date(), 1));

    return { from: n, to: n };
}

export function rangeThisWeek(): { from: Date; to: Date } {
    const n = new Date();

    return {
        from: startOfWeek(n, { weekStartsOn: 1 }),
        to: endOfWeek(n, { weekStartsOn: 1 }),
    };
}

export function rangeLastWeek(): { from: Date; to: Date } {
    const ref = subWeeks(new Date(), 1);

    return {
        from: startOfWeek(ref, { weekStartsOn: 1 }),
        to: endOfWeek(ref, { weekStartsOn: 1 }),
    };
}

export function rangeThisMonth(): { from: Date; to: Date } {
    const n = new Date();

    return { from: startOfMonth(n), to: endOfMonth(n) };
}

export function rangeLastMonth(): { from: Date; to: Date } {
    const ref = subMonths(new Date(), 1);

    return { from: startOfMonth(ref), to: endOfMonth(ref) };
}

export function rangeThisYear(): { from: Date; to: Date } {
    const n = new Date();

    return { from: startOfYear(n), to: endOfYear(n) };
}
