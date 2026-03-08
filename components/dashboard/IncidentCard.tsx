import { useState, useEffect } from "react";
import { MapPinIcon, ShieldCheckIcon, ClockIcon, BuildingOffice2Icon, TagIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import VerifiedBadge from "../badges/VerifiedBadge";

interface IncidentCardProps {
    id: string;
    reportId?: string;
    title?: string;
    location?: string;
    time?: string;
    isVerified?: boolean;
    source?: string;
    narrative?: string;
    department?: string;
    status?: string;
    initialVoteTally?: number;
    modelUsed?: string;
}

const SOURCE_LABELS: Record<string, string> = {
    city: "City of Montgomery",
    resident: "Community Report",
    news: "News Report",
    ai: "AI Analysis",
};

export default function IncidentCard({
    id,
    reportId,
    title = "Incident",
    location,
    time = "Just now",
    isVerified = false,
    source = "city",
    narrative,
    department,
    status = "active",
    initialVoteTally = 0,
    modelUsed,
}: IncidentCardProps) {
    const [hasVoted, setHasVoted] = useState(false);
    const [voteTally, setVoteTally] = useState<number>(initialVoteTally);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        setVoteTally(initialVoteTally);
    }, [initialVoteTally]);

    useEffect(() => {
        // Check localStorage for 15-min cooldown
        const lastVote = localStorage.getItem(`feedback_${id}`);
        if (lastVote) {
            const timestamp = parseInt(lastVote);
            if (Date.now() - timestamp < 15 * 60 * 1000) {
                setHasVoted(true);
            }
        }
    }, [id]);

    const handleFeedback = async (vote: 'accurate' | 'not_relevant') => {
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/narratives/${id}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vote }),
            });

            if (res.ok) {
                localStorage.setItem(`feedback_${id}`, Date.now().toString());
                setHasVoted(true);
                if (vote === 'accurate') setVoteTally(prev => prev + 1);
            } else if (res.status === 429) {
                setHasVoted(true);
            }
        } catch (err) {
            console.error("Failed to submit feedback", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const showFeedback = status !== 'resolved' && !hasVoted;

    return (
        <div className="group relative rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-5 transition-all hover:bg-[var(--color-bg-subtle)] hover:shadow-lg">
            <div className="flex flex-col gap-4">
                {/* Header: Title & Verification */}
                <div className="flex items-start justify-between gap-4">
                    <h3 className="text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-default)] transition-colors">
                        {title}
                    </h3>
                    {(isVerified || reportId || source === 'ai') && (
                        <VerifiedBadge
                            id={reportId || id}
                            table={reportId ? 'resident_reports' : 'narratives'}
                            initialStatus={isVerified ? (reportId ? 'verified' : 'active') : status}
                        />
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

                {/* Feedback Loop */}
                {showFeedback && (
                    <div className="bg-[var(--color-bg-subtle)] rounded-[var(--radius-sm)] p-3 border border-dashed border-[var(--color-border-subtle)] mt-2">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                                Is this still ongoing?
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleFeedback('accurate')}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-full hover:brightness-95 transition-all border border-[var(--color-success-border)] disabled:opacity-50"
                                >
                                    <CheckCircleIcon className="h-3 w-3" />
                                    Still ongoing
                                </button>
                                <button
                                    onClick={() => handleFeedback('not_relevant')}
                                    disabled={isSubmitting}
                                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-[var(--color-error-bg)] text-[var(--color-error)] rounded-full hover:brightness-95 transition-all border border-[var(--color-error-border)] disabled:opacity-50"
                                >
                                    <XCircleIcon className="h-3 w-3" />
                                    No longer active
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {(hasVoted || status === 'resolved') && (
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)] italic">
                        <CheckCircleIcon className="h-3 w-3 text-[var(--color-success)]" />
                        {voteTally} people confirm this is ongoing
                    </div>
                )}

                {/* Footer: Metadata */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-[var(--color-border-subtle)]">
                    {location && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-text-tertiary)]">
                            <MapPinIcon className="h-3.5 w-3.5" />
                            {location}
                        </div>
                    )}
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
                        {source === "ai" && modelUsed
                            ? `AI Analysis by ${modelUsed}`
                            : (SOURCE_LABELS[source] ?? source)}
                    </div>
                </div>
            </div>
        </div>
    );
}
