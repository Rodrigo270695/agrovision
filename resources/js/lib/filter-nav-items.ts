import type { NavItem } from '@/types';

export function filterNavItems(
    items: NavItem[],
    can: (permission?: string | null) => boolean,
): NavItem[] {
    return items
        .map((item) => {
            if (item.items?.length) {
                const children = filterNavItems(item.items, can);

                if (children.length === 0) {
                    return null;
                }

                return {
                    ...item,
                    items: children,
                };
            }

            if (!can(item.permission)) {
                return null;
            }

            return item;
        })
        .filter((item): item is NavItem => item !== null);
}
