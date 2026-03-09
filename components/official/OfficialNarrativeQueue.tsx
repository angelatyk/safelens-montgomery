"use client";

import { useState, useEffect, useMemo } from "react";
import { ClockIcon, ChatBubbleBottomCenterTextIcon, CheckBadgeIcon, AdjustmentsHorizontalIcon, ArchiveBoxIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface Narrative {
    id: string;
    title: string;
    content: string;
    generated_at: string;
    status: string;
    official_status: string;
    neighborhoods: { name: string } | null;
}

interface OfficialNarrativeQueueProps {
    selectedId: string | null;
    onSelect: (id: string) => void;
    refreshTrigger?: number;
}

export default function OfficialNarrativeQueue({ selectedId, onSelect, refreshTrigger = 0 }: OfficialNarrativeQueueProps) {
    const [narratives, setNarratives] = useState<Narrative[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        "Pending Review": true,
        "Active": true,
        "Resolved": false
    });

    const toggleSection = (title: string) => {
        setExpandedSections(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    const fetchNarratives = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/narratives");
            if (res.ok) {
                const data = await res.json();
                setNarratives(data.narratives);
            }
        } catch (err) {
            console.error("Failed to fetch narratives", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchNarratives();
    }, [refreshTrigger]);

    // Grouping logic
    const sections = useMemo(() => {
        const active = narratives.filter(n => (n.official_status || 'unreviewed') === 'unreviewed');
        const inProgress = narratives.filter(n => ['acknowledged', 'verified', 'dispatched'].includes(n.official_status || ''));
        const resolved = narratives.filter(n => (n.official_status || '') === 'resolved');

        return [
            { title: "Pending Review", icon: ChatBubbleBottomCenterTextIcon, items: active, color: "text-[var(--color-critical)]" },
            { title: "Active", icon: AdjustmentsHorizontalIcon, items: inProgress, color: "text-blue-500" },
            { title: "Resolved", icon: ArchiveBoxIcon, items: resolved, color: "text-[var(--color-text-tertiary)]" }
        ];
    }, [narratives]);

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg-surface)]">
            <div className="p-4 border-b border-[var(--color-border-default)]">
                <h2 className="text-lg font-bold flex items-center gap-2 text-[var(--color-text-primary)]">
                    Narrative Queue
                </h2>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                    AI-generated summaries across all neighborhoods.
                </p>
            </div>

            <div className="flex-1 overflow-y-auto">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-brand-default)] border-t-transparent" />
                    </div>
                ) : narratives.length === 0 ? (
                    <div className="text-center py-12 text-sm text-[var(--color-text-tertiary)]">
                        No narratives found.
                    </div>
                ) : (
                    <div className="flex flex-col">
                        {sections.map((section, idx) => (
                            <div key={section.title} className={idx !== 0 ? "mt-2" : ""}>
                                {/* Sticky Header */}
                                <div
                                    onClick={() => toggleSection(section.title)}
                                    className="sticky top-0 z-10 bg-[var(--color-bg-canvas)] px-4 py-2 border-y border-[var(--color-border-subtle)] flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        {expandedSections[section.title] ? (
                                            <ChevronDownIcon className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                                        ) : (
                                            <ChevronRightIcon className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                                        )}
                                        <section.icon className={`h-4 w-4 ${section.color}`} />
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[var(--color-text-secondary)]">
                                            {section.title}
                                        </span>
                                    </div>
                                    <span className="text-[10px] bg-black/40 border border-white/5 px-1.5 py-0.5 rounded text-[var(--color-text-tertiary)] font-bold">
                                        {section.items.length}
                                    </span>
                                </div>

                                {expandedSections[section.title] && (
                                    <div className="divide-y divide-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]">
                                        {section.items.length === 0 ? (
                                            <p className="px-5 py-4 text-[10px] italic text-[var(--color-text-tertiary)] bg-[var(--color-bg-subtle)]/30">
                                                No narratives in this status.
                                            </p>
                                        ) : (
                                            section.items.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => onSelect(n.id)}
                                                    className={`
                                                    relative p-4 cursor-pointer transition-all hover:bg-[var(--color-bg-subtle)]
                                                    ${selectedId === n.id ? "bg-[var(--color-brand-default)]/5 shadow-[inset_3px_0_0_var(--color-brand-default)]" : ""}
                                                `}
                                                >
                                                    <div className="flex items-start justify-between mb-1.5">
                                                        <span className="text-[10px] font-bold text-[var(--color-brand-default)] uppercase">
                                                            {n.neighborhoods?.name || "Global"}
                                                        </span>
                                                        <span className="text-[9px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                                                            <ClockIcon className="h-2.5 w-2.5" />
                                                            {new Date(n.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <h3 className={`text-sm font-bold leading-tight line-clamp-1 mb-1 ${selectedId === n.id ? "text-[var(--color-brand-default)]" : "text-[var(--color-text-primary)]"}`}>
                                                        {n.title || "Safety Intelligence Summary"}
                                                    </h3>
                                                    <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-2 leading-relaxed">
                                                        {n.content}
                                                    </p>
                                                </div>
                                            )))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="border-t border-[var(--color-border-default)] p-3 bg-[var(--color-bg-canvas)]/50">
                <button
                    onClick={fetchNarratives}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] hover:text-[var(--color-brand-default)] transition-colors py-1 cursor-pointer"
                >
                    Refresh Queue
                </button>
            </div>
        </div>
    );
}
