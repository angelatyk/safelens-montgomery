import { MapPinIcon, ShieldCheckIcon, ClockIcon, BuildingOffice2Icon, TagIcon } from "@heroicons/react/24/outline";

interface IncidentCardProps {
    title?: string;
    location?: string;
    time?: string;
    isVerified?: boolean;
    source?: string;
    narrative?: string;
    department?: string;
}

const SOURCE_LABELS: Record<string, string> = {
    city: "City of Montgomery",
    resident: "Community Report",
    news: "News Report",
};

export default function IncidentCard({
    title = "Incident",
    location = "Montgomery, AL",
    time = "Just now",
    isVerified = false,
    source = "city",
    narrative,
    department,
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
                        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-success-bg)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-success)] border border-[var(--color-success-border)]">
                            <ShieldCheckIcon className="h-3 w-3" />
                            Verified
                        </span>
                    )}
                </div>

                {/* AI Narrative or placeholder */}
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                    {narrative ?? (
                        <span className="italic text-[var(--color-text-tertiary)]">
                            AI context loading…
                        </span>
                    )}
                </p>

                {/* Footer: Metadata */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                        <MapPinIcon className="h-3.5 w-3.5" />
                        {location}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                        <ClockIcon className="h-3.5 w-3.5" />
                        {time}
                    </div>
                    {department && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                            <BuildingOffice2Icon className="h-3.5 w-3.5" />
                            {department}
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)] ml-auto">
                        <TagIcon className="h-3.5 w-3.5" />
                        {SOURCE_LABELS[source] ?? source}
                    </div>
                </div>
            </div>
        </div>
    );
}