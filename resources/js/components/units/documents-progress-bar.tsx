import { cn } from '@/lib/utils';

export type DocumentsProgress = {
    done: number;
    total: number;
    percent: number;
};

type Props = {
    progress: DocumentsProgress;
    className?: string;
    showLabel?: boolean;
    size?: 'sm' | 'md';
};

export function DocumentsProgressBar({
    progress,
    className,
    showLabel = true,
    size = 'sm',
}: Props) {
    const percent = Math.max(0, Math.min(100, progress.percent));
    const complete = percent >= 100;

    return (
        <div className={cn('min-w-[7.5rem]', className)}>
            {showLabel ? (
                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                    <span
                        className={cn(
                            'font-medium',
                            complete ? 'text-emerald-700' : 'text-[#5a7390]',
                        )}
                    >
                        {percent}%
                    </span>
                    <span className="text-[#6b8ead]">
                        {progress.done}/{progress.total}
                    </span>
                </div>
            ) : null}
            <div
                className={cn(
                    'overflow-hidden rounded-full bg-[#e8eef6]',
                    size === 'md' ? 'h-2.5' : 'h-1.5',
                )}
            >
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-300',
                        complete ? 'bg-emerald-600' : 'bg-[#2e5a9e]',
                    )}
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}
