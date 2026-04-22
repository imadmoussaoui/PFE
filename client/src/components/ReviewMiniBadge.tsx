interface ReviewMiniBadgeProps {
    averageRating: number;
}

export default function ReviewMiniBadge({ averageRating }: ReviewMiniBadgeProps) {
    const normalized = Math.max(0, Math.min(5, averageRating || 0));

    return (
        <div
            className="inline-flex items-center gap-0.5 rounded-full border border-slate-300/70 bg-slate-100/80 px-1.5 py-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
            title={`${normalized.toFixed(1)}/5`}
            aria-label={`${normalized.toFixed(1)} sur 5`}
        >
            {Array.from({ length: 5 }).map((_, index) => {
                const fillRatio = Math.max(0, Math.min(1, normalized - index));
                return (
                    <span key={index} className="relative inline-flex h-2.5 w-2.5">
                        <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-slate-300" fill="currentColor" aria-hidden="true">
                            <path d="M12 17.3l-5.877 3.09 1.123-6.545L2.49 9.21l6.573-.955L12 2.3l2.938 5.955 6.573.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        <span className="absolute inset-0 overflow-hidden" style={{ width: `${fillRatio * 100}%` }}>
                            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 text-amber-500" fill="currentColor" aria-hidden="true">
                                <path d="M12 17.3l-5.877 3.09 1.123-6.545L2.49 9.21l6.573-.955L12 2.3l2.938 5.955 6.573.955-4.756 4.635 1.123 6.545z" />
                            </svg>
                        </span>
                    </span>
                );
            })}
        </div>
    );
}
