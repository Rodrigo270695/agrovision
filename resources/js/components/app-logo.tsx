import { usePage } from '@inertiajs/react';
import { TenantBrandMark } from '@/components/tenant-brand-mark';

export default function AppLogo() {
    const { tenant, central, name: appName } = usePage().props;
    const name = central ? 'Grupo Indelsi' : (tenant?.name ?? appName ?? 'Grupo Indelsi');
    const logo = central ? '/logo.png' : (tenant?.sidebar_logo ?? tenant?.logo ?? null);

    return (
        <>
            <div className="flex aspect-square size-8 items-center justify-center overflow-hidden rounded-lg bg-transparent">
                <TenantBrandMark
                    name={name}
                    logo={logo}
                    className="size-8 rounded-lg text-[11px]"
                    imageClassName="size-8"
                />
            </div>
            <div className="ml-1.5 grid min-w-0 flex-1 text-left">
                <span className="truncate text-[13px] leading-tight font-semibold tracking-tight text-[#1a2b4c] dark:text-sidebar-foreground">
                    {name}
                </span>
                <span className="truncate text-[10px] leading-tight font-medium text-[#2e5a9e]">
                    {central ? 'Soporte' : 'Operación SST'}
                </span>
            </div>
        </>
    );
}
