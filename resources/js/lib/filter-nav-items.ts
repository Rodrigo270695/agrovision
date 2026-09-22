import type { NavItem } from '@/types';

export function filterNavItems(
    items: NavItem[],
    can: (permission?: string | null) => boolean,
    moduleEnabled: (module?: string | null) => boolean = () => true,
): NavItem[] {
    return items
        .map((item) => {
            if (item.items?.length) {
                const children = filterNavItems(item.items, can, moduleEnabled);

                if (children.length === 0) {
                    return null;
                }

                return {
                    ...item,
                    items: children,
                };
            }

            if (!moduleEnabled(item.module)) {
                return null;
            }

            if (!can(item.permission)) {
                return null;
            }

            return item;
        })
        .filter((item): item is NavItem => item !== null);
}
