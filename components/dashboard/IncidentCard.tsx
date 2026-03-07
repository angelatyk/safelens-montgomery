import { MapPinIcon, ShieldCheckIcon, ClockIcon } from "@heroicons/react/24/outline";

interface IncidentCardProps {
    title?: string;
    location?: string;
    time?: string;
    isVerified?: boolean;
}

export default function IncidentCard({
    title = "Incident Title",
    location = "Location Placeholder",
    time = "Just now",
    isVerified = false
}: IncidentCardProps) {
    return (
        <div className="group relative cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 transition-all hover:bg-[var(--color-bg-subtle)] hover:shadow-lg">
            <div className="flex flex-col gap-4">
                {/* Header: Title & Verification */}
                <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-default)] transition-colors">
                        {title}
                    </h3>
                    {isVerified && (
                        <span className="flex items-center gap-1 rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)] border border-[var(--color-success-border)]">
                            <ShieldCheckIcon className="h-3 w-3" />
                            Verified
                        </span>
                    )}
                </div>

                {/* Content: AI Summary Placeholder */}
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    [AI-generated summary placeholder: Moves beyond raw data to provide actionable context about this safety pattern.]
                </p>

                {/* Footer: Metadata */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-[var(--color-border-subtle)] md:pt-0 md:border-t-0">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                        <MapPinIcon className="h-3.5 w-3.5" />
                        {location}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {time}
                    </div>
                </div>
            </div>
        </div>
    );
}
