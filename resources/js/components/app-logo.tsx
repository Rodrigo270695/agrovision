import { usePage } from '@inertiajs/react';
import { TenantBrandMark } from '@/components/tenant-brand-mark';

export default function AppLogo() {
    const { tenant, central, name: appName } = usePage().props;
    const name = central
        ? 'Grupo Indelsi'
        : (tenant?.name ?? appName ?? 'Grupo Indelsi');
    const logo = central
        ? '/logo.png'
        : (tenant?.sidebar_logo ?? tenant?.logo ?? null);

    return (
        <>
            <div className="flex aspect-square size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-100 ring-1 ring-brand-200/80">
                <TenantBrandMark
                    name={name}
                    logo={logo}
                    className="size-9 rounded-xl text-[11px]"
                    imageClassName="size-9"
                />
            </div>
            <div className="ml-2 grid min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                <span className="font-display truncate text-[13px] leading-tight font-bold tracking-tight text-brand-800">
                    {name}
                </span>
                <span className="truncate text-[10px] leading-tight font-semibold tracking-[0.04em] text-brand-500 uppercase">
                    {central ? 'Soporte' : 'Operación SST'}
                </span>
            </div>
        </>
    );
}
