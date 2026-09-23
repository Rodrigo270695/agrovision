import { usePage } from '@inertiajs/react';
import type { ImgHTMLAttributes } from 'react';

type Props = ImgHTMLAttributes<HTMLImageElement>;

function initialsFrom(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);

    if (parts.length === 0) {
        return 'EM';
    }

    return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

export default function AppLogoIcon({ className, alt, ...props }: Props) {
    const { tenant, central } = usePage().props;
    const name = central ? 'Grupo Indelsi' : (tenant?.name ?? 'Empresa');
    const logo = central
        ? '/logo.png'
        : (tenant?.login_logo ?? tenant?.sidebar_logo ?? tenant?.logo ?? null);

    if (!logo) {
        return (
            <span
                className={className}
                role="img"
                aria-label={name}
            >
                {initialsFrom(name)}
            </span>
        );
    }

    return <img src={logo} alt={alt ?? name} className={className} {...props} />;
}
