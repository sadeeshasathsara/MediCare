import { cn } from '@/lib/utils'

export function Skeleton({ className, style, ...props }) {
    return (
        <div
            className={cn('animate-pulse rounded-md', className)}
            style={{ backgroundColor: 'hsl(var(--muted) / 0.55)', ...style }}
            {...props}
        />
    )
}
