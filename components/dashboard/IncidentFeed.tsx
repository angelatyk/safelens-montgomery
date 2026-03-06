"use client";

import { useState } from "react";
import IncidentCard from "./IncidentCard";

const INITIAL_INCIDENTS = [
    {
        id: "1",
        title: "Potential Civil Disturbance: Market & 5th",
        location: "Downtown Montgomery",
        time: "14 mins ago",
        isVerified: true,
    },
    {
        id: "2",
        title: "Road Hazard: Debris on I-65",
        location: "I-65 Southbound",
        time: "32 mins ago",
        isVerified: false,
    },
    {
        id: "3",
        title: "Public Service: Water Main Leak",
        location: "Cloverdale Neighborhood",
        time: "1 hour ago",
        isVerified: true,
    },
];

const MORE_INCIDENTS = [
    {
        id: "4",
        title: "Noise Complaint: 2nd Avenue",
        location: "Old Cloverdale",
        time: "2 hours ago",
        isVerified: false,
    },
    {
        id: "5",
        title: "Traffic Signal Failure: Ann St",
        location: "Capitol Heights",
        time: "3 hours ago",
        isVerified: true,
    },
];

export default function IncidentFeed() {
    const [incidents, setIncidents] = useState(INITIAL_INCIDENTS);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const handleLoadMore = () => {
        setIsLoading(true);
        // Simulate API delay
        setTimeout(() => {
            setIncidents((prev) => [...prev, ...MORE_INCIDENTS]);
            setIsLoading(false);
            setHasMore(false); // For this demo, we only have one extra batch
        }, 800);
    };

    return (
        <section className="flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">
                    Safety Intelligence Feed
                </h2>
                <span className="text-xs text-[var(--color-text-tertiary)]">
                    Updating in real-time
                </span>
            </div>

            {/* Feed list */}
            <div className="grid gap-4">
                {incidents.map((incident) => (
                    <IncidentCard
                        key={incident.id}
                        title={incident.id === "1" ? incident.title : incident.title}
                        location={incident.location}
                        time={incident.time}
                        isVerified={incident.isVerified}
                    />
                ))}

                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-brand-default)] border-t-transparent" />
                    </div>
                )}
            </div>

            {hasMore && !isLoading && (
                <button
                    onClick={handleLoadMore}
                    className="w-full cursor-pointer rounded-[var(--radius-md)] border border-[var(--color-border-default)] py-3 text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                >
                    View More Incidents
                </button>
            )}

            {!hasMore && (
                <p className="text-center text-xs text-[var(--color-text-tertiary)] py-4">
                    All recent incidents have been loaded.
                </p>
            )}
        </section>
    );
}
