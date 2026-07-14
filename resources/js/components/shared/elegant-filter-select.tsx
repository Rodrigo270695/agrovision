import type { LucideIcon } from 'lucide-react';
import { Layers } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type ElegantFilterOption = {
    value: string;
    label: string;
    description?: string;
    icon?: LucideIcon;
    iconClassName?: string;
};

type Props = {
    value?: string | null;
    options: ElegantFilterOption[];
    onChange: (value: string | null) => void;
    triggerIcon: LucideIcon;
    allLabel?: string;
    allDescription?: string;
    allIcon?: LucideIcon;
    placeholder?: string;
    className?: string;
    contentClassName?: string;
};

export function ElegantFilterSelect({
    value,
    options,
    onChange,
    triggerIcon: TriggerIcon,
    allLabel = 'Todos',
    allDescription,
    allIcon: AllIcon = Layers,
    placeholder,
    className,
    contentClassName,
}: Props) {
    const selected = options.find((option) => option.value === value);
    const rawValue = value && value !== '' ? value : 'all';
    const selectValue =
        rawValue === 'all' || options.some((option) => option.value === rawValue)
            ? rawValue
            : 'all';

    const triggerLabel =
        selectValue === 'all'
            ? (placeholder ?? allLabel)
            : (selected?.label ?? placeholder ?? allLabel);

    return (
        <Select
            value={selectValue}
            onValueChange={(next) => {
                onChange(next === 'all' ? null : next);
            }}
        >
            <SelectTrigger
                className={cn(
                    'h-10 w-full cursor-pointer border-[#c5d5e6] bg-white text-[#1a2b4c] shadow-none focus:border-[#2e5a9e] focus:ring-[#4a90e2]/35 sm:w-[220px]',
                    className,
                )}
            >
                <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-[#e8f1fa] text-[#2e5a9e]">
                        <TriggerIcon className="size-3.5" />
                    </span>
                    <SelectValue placeholder={placeholder ?? allLabel}>
                        <span className="truncate text-sm">{triggerLabel}</span>
                    </SelectValue>
                </div>
            </SelectTrigger>

            <SelectContent
                align="start"
                className={cn(
                    'w-[var(--radix-select-trigger-width)] min-w-[220px] border-[#d7e3f0] bg-white shadow-lg',
                    contentClassName,
                )}
            >
                <SelectItem
                    value="all"
                    className="cursor-pointer py-2 focus:bg-[#e8f1fa] focus:text-[#1a2b4c]"
                >
                    <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-[#eef1f5] text-[#64748b]">
                            <AllIcon className="size-3.5" />
                        </span>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{allLabel}</span>
                            {allDescription ? (
                                <span className="text-[11px] text-[#6b8ead]">
                                    {allDescription}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </SelectItem>

                {options.map((option) => {
                    const Icon = option.icon;

                    return (
                        <SelectItem
                            key={option.value}
                            value={option.value}
                            className="cursor-pointer py-2 focus:bg-[#e8f1fa] focus:text-[#1a2b4c]"
                        >
                            <div className="flex items-center gap-2">
                                {Icon ? (
                                    <span
                                        className={cn(
                                            'flex size-7 items-center justify-center rounded-lg bg-[#e8f1fa] text-[#2e5a9e]',
                                            option.iconClassName,
                                        )}
                                    >
                                        <Icon className="size-3.5" />
                                    </span>
                                ) : null}
                                <div className="flex min-w-0 flex-col">
                                    <span className="truncate text-sm font-medium">
                                        {option.label}
                                    </span>
                                    {option.description ? (
                                        <span className="text-[11px] text-[#6b8ead]">
                                            {option.description}
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </SelectItem>
                    );
                })}
            </SelectContent>
        </Select>
    );
}
