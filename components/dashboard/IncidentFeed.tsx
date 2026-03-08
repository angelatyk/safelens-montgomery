"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import IncidentCard from "./IncidentCard";

const PAGE_SIZE = 10;

type Incident = {
    id: string;
    type: string;
    neighborhood_id: string | null;
    lat: string | null;
    lng: string | null;
    occurred_at: string;
    source: string;
    raw_data: {
        address?: string;
        department?: string;
        status?: string;
        district?: string;
        origin?: string;
        narrative?: string;
    };
    narratives?: { content: string }[];
};

function formatTime(occurred_at: string): string {
    const diffMs = Date.now() - new Date(occurred_at).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} mins ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
}

export default function IncidentFeed() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [offset, setOffset] = useState(0);

    const [user, setUser] = useState<User | null>(null);

    const fetchIncidents = async (currentOffset: number, append: boolean) => {
        try {
            const res = await fetch(
                `/api/incidents?limit=${PAGE_SIZE}&offset=${currentOffset}`
            );
            if (!res.ok) throw new Error("Failed to fetch incidents");
            const data = await res.json();

            setIncidents((prev) =>
                append ? [...prev, ...data.incidents] : data.incidents
            );
            setHasMore(data.incidents.length === PAGE_SIZE);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
        }
    };

    useEffect(() => {
        setIsLoading(true);
        fetchIncidents(0, false).finally(() => setIsLoading(false));

        const supabase = createClient();
        supabase.auth.getUser().then(({ data }) => setUser(data.user));

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        // Event listener for when modal in TopBar submits successfully
        const handleIncidentReported = () => {
            setOffset(0);
            fetchIncidents(0, false);
        };
        window.addEventListener('incidentReported', handleIncidentReported);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('incidentReported', handleIncidentReported);
        };
    }, []);

    const handleLoadMore = async () => {
        const nextOffset = offset + PAGE_SIZE;
        setIsLoadingMore(true);
        await fetchIncidents(nextOffset, true);
        setOffset(nextOffset);
        setIsLoadingMore(false);
    };

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
                    incidents.map((incident) => (
                        <IncidentCard
                            key={incident.id}
                            title={incident.type}
                            location={
                                incident.raw_data?.address ||
                                (incident.neighborhood_id ?? "Montgomery, AL")
                            }
                            time={formatTime(incident.occurred_at)}
                            isVerified={incident.raw_data?.status === "Closed"}
                            source={incident.source}
                            narrative={incident.narratives?.[0]?.content ?? incident.raw_data?.narrative}
                            department={incident.raw_data?.department}
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
                    onClick={handleLoadMore}
                    className="w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border-default)] py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                >
                    View More Incidents
                </button>
            )}

            {!hasMore && !isLoading && (
                <p className="text-center text-xs text-[var(--color-text-tertiary)] py-4">
                    All recent incidents have been loaded.
                </p>
            )}
        </section>
    );
}