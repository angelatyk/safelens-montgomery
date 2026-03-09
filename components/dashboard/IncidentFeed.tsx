"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/hooks/useUser";
import IncidentCard from "./IncidentCard";

const ACTIVE_PAGE_SIZE = 5;

type Narrative = {
    id: string;
    content: string;
    generated_at: string;
    neighborhood_id: string | null;
    neighborhoods: { id: string; name: string } | null;
    status: string;
    resident_report_id: string | null;
    vote_tally?: number;
    title?: string;
    model_used?: string;
    official_status?: string;
    latest_public_update?: string | null;
};

function formatTime(occurred_at: string): string {
    const diffMs = Date.now() - new Date(occurred_at).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
}

export default function IncidentFeed() {
    const [activeNarratives, setActiveNarratives] = useState<Narrative[]>([]);
    const [resolvedNarratives, setResolvedNarratives] = useState<Narrative[]>([]);
    const [isLoadingActive, setIsLoadingActive] = useState(true);
    const [isLoadingResolved, setIsLoadingResolved] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreActive, setHasMoreActive] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeOffset, setActiveOffset] = useState(0);

    const fetchActiveNarratives = async (currentOffset: number, append: boolean) => {
        try {
            const res = await fetch(
                `/api/narratives?status_group=active&limit=${ACTIVE_PAGE_SIZE}&offset=${currentOffset}`
            );
            if (!res.ok) throw new Error("Failed to fetch active narratives");
            const data = await res.json();

            setActiveNarratives((prev) =>
                append ? [...prev, ...data.narratives] : data.narratives
            );
            setHasMoreActive(data.narratives.length === ACTIVE_PAGE_SIZE);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong fetching active narratives");
        }
    };

    const fetchResolvedNarratives = async () => {
        try {
            const res = await fetch(
                `/api/narratives?status_group=resolved&since_hours=48&limit=50`
            );
            if (!res.ok) throw new Error("Failed to fetch past narratives");
            const data = await res.json();
            setResolvedNarratives(data.narratives);
        } catch (err) {
            console.error("Failed to fetch past narratives:", err);
        }
    };

    useEffect(() => {
        setIsLoadingActive(true);
        setIsLoadingResolved(true);
        Promise.all([
            fetchActiveNarratives(0, false),
            fetchResolvedNarratives()
        ]).finally(() => {
            setIsLoadingActive(false);
            setIsLoadingResolved(false);
        });
    }, []);

    useEffect(() => {
        const handleIncidentReported = () => {
            setActiveOffset(0);
            fetchActiveNarratives(0, false);
        };
        window.addEventListener('incidentReported', handleIncidentReported);
        return () => window.removeEventListener('incidentReported', handleIncidentReported);
    }, []);

    const isLoading = isLoadingActive || isLoadingMore;

    return (
        <section className="flex flex-col gap-12">
            {/* Current Safety Feed */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
                    <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                        Safety Intelligence Feed
                    </h2>
                    <span className="text-xs text-[var(--color-text-tertiary)] hidden sm:inline-block">
                        Updating in real-time
                    </span>
                </div>

                <div className="grid gap-4">
                    {isLoadingActive && (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-brand-default)] border-t-transparent" />
                        </div>
                    )}

                    {error && (
                        <p className="text-center text-sm text-red-500 py-4">{error}</p>
                    )}

                    {!isLoadingActive && activeNarratives.length === 0 && (
                        <p className="text-center text-sm text-[var(--color-text-tertiary)] py-8">
                            No active incidents at the moment.
                        </p>
                    )}

                    {!isLoadingActive &&
                        activeNarratives.map((narrative) => (
                            <IncidentCard
                                key={narrative.id}
                                id={narrative.id}
                                reportId={narrative.resident_report_id || undefined}
                                title={narrative.title}
                                location={narrative.neighborhoods?.name || undefined}
                                time={formatTime(narrative.generated_at)}
                                source="ai"
                                narrative={narrative.content}
                                status={narrative.status}
                                initialVoteTally={narrative.vote_tally}
                                modelUsed={narrative.model_used}
                                officialStatus={narrative.official_status}
                                latestPublicUpdate={narrative.latest_public_update}
                            />
                        ))}

                    {isLoadingMore && (
                        <div className="flex items-center justify-center py-4">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-brand-default)] border-t-transparent" />
                        </div>
                    )}

                    {hasMoreActive && !isLoadingMore && !isLoadingActive && (
                        <button
                            onClick={async () => {
                                const nextOffset = activeOffset + ACTIVE_PAGE_SIZE;
                                setIsLoadingMore(true);
                                await fetchActiveNarratives(nextOffset, true);
                                setActiveOffset(nextOffset);
                                setIsLoadingMore(false);
                            }}
                            className="mt-2 w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border-default)] py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                        >
                            View More Summaries
                        </button>
                    )}
                </div>
            </div>

            {/* Past Incidents Section */}
            {!isLoadingResolved && resolvedNarratives.length > 0 && (
                <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
                        <h2 className="text-xl font-bold text-[var(--color-text-secondary)]">
                            Past Incidents
                        </h2>
                        <span className="text-[10px] uppercase font-black tracking-widest text-[var(--color-text-tertiary)] bg-[var(--color-bg-canvas)] px-2 py-0.5 rounded">
                            Last 48 Hours
                        </span>
                    </div>

                    <div className="grid gap-4 opacity-80">
                        {resolvedNarratives.map((narrative) => (
                            <IncidentCard
                                key={narrative.id}
                                id={narrative.id}
                                reportId={narrative.resident_report_id || undefined}
                                title={narrative.title}
                                location={narrative.neighborhoods?.name || undefined}
                                time={formatTime(narrative.generated_at)}
                                source="ai"
                                narrative={narrative.content}
                                status={narrative.status}
                                initialVoteTally={narrative.vote_tally}
                                modelUsed={narrative.model_used}
                            />
                        ))}
                    </div>
                </div>
            )}

            {!hasMoreActive && !isLoadingActive && (
                <p className="text-center text-xs text-[var(--color-text-tertiary)] py-4">
                    All recent safety summaries have been loaded.
                </p>
            )}
        </section>
    );
}
