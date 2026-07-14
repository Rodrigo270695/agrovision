import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import {
    Dialog,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type AppModalProps = {
    open: boolean;
    onClose: () => void;
    title: string;
    description?: string;
    children: ReactNode;
    footer: ReactNode;
    className?: string;
    bodyClassName?: string;
};

/**
 * Modal padre reutilizable.
 * Solo se cierra con Esc, botón X o acciones del footer (Cancelar).
 * El clic fuera no cierra el modal.
 */
function isPortalDropdownTarget(target: EventTarget | null): boolean {
    return (
        target instanceof Element &&
        Boolean(target.closest('[data-portal-dropdown]'))
    );
}

export function AppModal({
    open,
    onClose,
    title,
    description,
    children,
    footer,
    className,
    bodyClassName,
}: AppModalProps) {
    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    onClose();
                }
            }}
        >
            <DialogPortal>
                <DialogOverlay className="bg-[#0b1729]/55 backdrop-blur-[2px]" />
                <DialogPrimitive.Content
                    data-slot="dialog-content"
                    onPointerDownOutside={(event) => {
                        if (isPortalDropdownTarget(event.target)) {
                            return;
                        }

                        event.preventDefault();
                    }}
                    onInteractOutside={(event) => {
                        if (isPortalDropdownTarget(event.target)) {
                            return;
                        }

                        event.preventDefault();
                    }}
                    onFocusOutside={(event) => {
                        if (isPortalDropdownTarget(event.target)) {
                            return;
                        }

                        event.preventDefault();
                    }}
                    className={cn(
                        'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 flex max-h-[min(90vh,52rem)] w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-2xl border border-[#d7e3f0] shadow-2xl duration-200 sm:max-w-lg',
                        className,
                    )}
                >
                    <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#e2eaf3] bg-[#f7fafc] px-4 py-3 sm:px-5">
                        <div className="space-y-0.5 pr-6">
                            <DialogTitle className="font-display text-base font-semibold text-[#1a2b4c] sm:text-lg">
                                {title}
                            </DialogTitle>
                            {description ? (
                                <DialogDescription className="text-xs text-[#5a7390] sm:text-sm">
                                    {description}
                                </DialogDescription>
                            ) : (
                                <DialogDescription className="sr-only">
                                    {title}
                                </DialogDescription>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-lg p-1.5 text-[#6b8ead] transition-colors hover:bg-white hover:text-[#1a2b4c]"
                            aria-label="Cerrar"
                        >
                            <XIcon className="size-4" />
                        </button>
                    </header>

                    <div
                        className={cn(
                            'min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5',
                            bodyClassName,
                        )}
                    >
                        {children}
                    </div>

                    <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[#e2eaf3] bg-[#f7fafc] px-4 py-3 sm:flex-row sm:justify-end sm:px-5">
                        {footer}
                    </footer>
                </DialogPrimitive.Content>
            </DialogPortal>
        </Dialog>
    );
}
