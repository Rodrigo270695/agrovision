import { MoreHorizontal, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type RowActionItem = {
    key: string;
    label: string;
    icon: LucideIcon;
    onSelect?: () => void;
    href?: string;
    target?: string;
    tone?: 'default' | 'danger' | 'warning' | 'success';
    disabled?: boolean;
    separatorBefore?: boolean;
};

type Props = {
    label: string;
    items: RowActionItem[];
};

const toneClass: Record<NonNullable<RowActionItem['tone']>, string> = {
    default: 'text-foreground',
    danger: 'text-red-700',
    warning: 'text-amber-700',
    success: 'text-emerald-700',
};

export function RowActionsMenu({ label, items }: Props) {
    const visible = items.filter((item) => !item.disabled || item.onSelect || item.href);
    const [open, setOpen] = useState(false);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLMenuElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    const close = () => setOpen(false);

    const updatePosition = () => {
        const trigger = triggerRef.current;

        if (!trigger) {
            return;
        }

        const rect = trigger.getBoundingClientRect();
        const width = 196;

        setCoords({
            top: rect.bottom + 4,
            left: Math.max(8, rect.right - width),
        });
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        updatePosition();

        const onPointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;

            if (
                (triggerRef.current && target && triggerRef.current.contains(target)) ||
                (menuRef.current && target && menuRef.current.contains(target))
            ) {
                return;
            }

            close();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
            }
        };

        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, true);
        document.addEventListener('mousedown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
            document.removeEventListener('mousedown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    if (visible.length === 0) {
        return null;
    }

    const itemClass =
        'flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs outline-none hover:bg-accent';

    return (
        <>
            <Button
                ref={triggerRef}
                type="button"
                variant="ghost"
                size="icon"
                aria-label={label}
                aria-expanded={open}
                aria-haspopup="menu"
                className="size-8 cursor-pointer text-[#5a7390] hover:bg-[#f2f5f8] hover:text-[#1a2b4c]"
                onClick={() => setOpen((value) => !value)}
            >
                <MoreHorizontal className="size-4" strokeWidth={2.5} />
            </Button>

            {open && typeof document !== 'undefined'
                ? createPortal(
                      <menu
                          ref={menuRef}
                          style={{
                              top: coords.top,
                              left: coords.left,
                              width: 196,
                          }}
                          className="fixed z-[200] m-0 h-fit max-h-none list-none rounded-md border bg-white p-1 text-foreground shadow-md"
                      >
                          {visible.map((item) => {
                              const Icon = item.icon;
                              const className = cn(
                                  itemClass,
                                  toneClass[item.tone ?? 'default'],
                                  item.disabled &&
                                      'cursor-not-allowed text-muted-foreground hover:bg-transparent',
                              );

                              return (
                                  <li key={item.key}>
                                      {item.separatorBefore ? (
                                          <div className="bg-border my-1 h-px" />
                                      ) : null}
                                      {item.href && !item.disabled ? (
                                          <a
                                              href={item.href}
                                              target={item.target}
                                              rel={
                                                  item.target === '_blank'
                                                      ? 'noopener noreferrer'
                                                      : undefined
                                              }
                                              className={className}
                                              onClick={close}
                                          >
                                              <Icon
                                                  className="size-3.5"
                                                  strokeWidth={2.25}
                                              />
                                              {item.label}
                                          </a>
                                      ) : (
                                          <button
                                              type="button"
                                              disabled={item.disabled}
                                              className={className}
                                              onClick={() => {
                                                  if (item.disabled) {
                                                      return;
                                                  }

                                                  close();
                                                  item.onSelect?.();
                                              }}
                                          >
                                              <Icon
                                                  className="size-3.5"
                                                  strokeWidth={2.25}
                                              />
                                              {item.label}
                                          </button>
                                      )}
                                  </li>
                              );
                          })}
                      </menu>,
                      document.body,
                  )
                : null}
        </>
    );
}
