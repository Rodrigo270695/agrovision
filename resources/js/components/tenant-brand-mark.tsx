import { cn } from '@/lib/utils';

function initialsFrom(name: string): string {
    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) {
        return 'EM';
    }

    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export function TenantBrandMark({
    name,
    logo,
    className,
    imageClassName,
    fallbackClassName,
}: {
    name: string;
    logo?: string | null;
    className?: string;
    imageClassName?: string;
    fallbackClassName?: string;
}) {
    if (logo) {
        return (
            <img
                src={logo}
                alt={name}
                className={cn('object-contain', imageClassName)}
            />
        );
    }

    return (
        <div
            className={cn(
                'flex items-center justify-center rounded-xl bg-[#122038] text-white',
                className,
                fallbackClassName,
            )}
            aria-label={name}
        >
            <span className="font-display font-semibold tracking-wide">
                {initialsFrom(name)}
            </span>
        </div>
    );
}
