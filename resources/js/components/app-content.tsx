import * as React from 'react';
import { SidebarInset } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { AppVariant } from '@/types';

type Props = React.ComponentProps<'main'> & {
    variant?: AppVariant;
};

export function AppContent({
    variant = 'sidebar',
    children,
    className,
    ...props
}: Props) {
    if (variant === 'sidebar') {
        return (
            <SidebarInset
                className={cn(
                    'min-h-0 flex-1 overflow-hidden',
                    // Inset aplica m-2 (0.5rem * 2); la altura debe descontar ese margen
                    'h-dvh max-h-dvh md:my-2 md:mr-2 md:h-[calc(100dvh-1rem)] md:max-h-[calc(100dvh-1rem)]',
                    className,
                )}
                {...props}
            >
                {children}
            </SidebarInset>
        );
    }

    return (
        <main
            className="mx-auto flex h-full w-full max-w-7xl flex-1 flex-col gap-4 rounded-xl"
            {...props}
        >
            {children}
        </main>
    );
}
