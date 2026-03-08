"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/hooks/useUser";
import IncidentCard from "./IncidentCard";

const PAGE_SIZE = 10;

type Narrative = {
    id: string;
    content: string;
    generated_at: string;
    neighborhood_id: string | null;
    neighborhoods: { id: string; name: string } | null;
};

function formatTime(occurred_at: string): string {
    const diffMs = Date.now() - new Date(occurred_at).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
}

export default function IncidentFeed() {
    const [narratives, setNarratives] = useState<Narrative[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);

    const fetchNarratives = async (currentOffset: number, append: boolean) => {
        try {
            const res = await fetch(
                `/api/narratives?limit=${PAGE_SIZE}&offset=${currentOffset}`
            );
            if (!res.ok) throw new Error("Failed to fetch narratives");
            const data = await res.json();

            setNarratives((prev) =>
                append ? [...prev, ...data.narratives] : data.narratives
            );
            setHasMore(data.narratives.length === PAGE_SIZE);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchNarratives(0, false).finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        // Refresh the feed when a new incident is reported via the TopBar modal
        // Though narratives are AI-generated, we might want to refresh anyway 
        // if the system triggers a new generation on report.
        const handleIncidentReported = () => {
            setOffset(0);
            fetchNarratives(0, false);
        };
        window.addEventListener('incidentReported', handleIncidentReported);
        return () => window.removeEventListener('incidentReported', handleIncidentReported);
    }, []);



    return (
        <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                    Safety Intelligence Feed
                </h2>
                <span className="text-xs text-[var(--color-text-tertiary)] hidden sm:inline-block">
                    Updating in real-time
                </span>
            </div>

            <div className="grid gap-4">
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-brand-default)] border-t-transparent" />
                    </div>
                )}

                {error && (
                    <p className="text-center text-sm text-red-500 py-4">{error}</p>
                )}

                {!isLoading &&
                    narratives.map((narrative) => (
                        <IncidentCard
                            key={narrative.id}
                            title="Safety Intelligence Summary"
                            location={narrative.neighborhoods?.name || undefined}
                            time={formatTime(narrative.generated_at)}
                            source="ai"
                            narrative={narrative.content}
                        />
                    ))}

                {isLoadingMore && (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-brand-default)] border-t-transparent" />
                    </div>
                )}
            </div>

            {hasMore && !isLoadingMore && !isLoading && (
                <button
                    onClick={async () => {
                        const nextOffset = offset + PAGE_SIZE;
                        setIsLoadingMore(true);
                        await fetchNarratives(nextOffset, true);
                        setOffset(nextOffset);
                        setIsLoadingMore(false);
                    }}
                    className="w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border-default)] py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                >
                    View More Summaries
                </button>
            )}

            {!hasMore && !isLoading && (
                <p className="text-center text-xs text-[var(--color-text-tertiary)] py-4">
                    All recent safety summaries have been loaded.
                </p>
            )}
        </section>
    );
}