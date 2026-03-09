"use client";

import { useState, useEffect, useMemo } from "react";
import { ClockIcon, ChatBubbleBottomCenterTextIcon, AdjustmentsHorizontalIcon, ArchiveBoxIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

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

// The content pane must not push the Resolved header off screen.
// Total fixed height accounted for:
//   TopBar (64) + Footer (32) = 96 (already baked into the outer container)
//   Queue title bar ≈ 80px  (title + subtitle, may wrap on mobile)
//   3 section headers × 52px = 156px
// Buffer: content pane should fill remaining space but never exceed it.
const CONTENT_MAX_HEIGHT = 'calc(100dvh - 350px)';

export default function OfficialNarrativeQueue({ selectedId, onSelect, refreshTrigger = 0 }: OfficialNarrativeQueueProps) {
    const [narratives, setNarratives] = useState<Narrative[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    // null = all collapsed; string = which section is open
    const [activeSection, setActiveSection] = useState<string | null>("Pending Review");

    const toggle = (title: string) =>
        setActiveSection(prev => prev === title ? null : title);

    const fetchNarratives = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/narratives?limit=all");
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

    useEffect(() => { fetchNarratives(); }, [refreshTrigger]);

    const sections = useMemo(() => {
        const pending = narratives.filter(n => (n.official_status || 'unreviewed') === 'unreviewed');
        const active = narratives.filter(n => ['acknowledged', 'verified', 'dispatched'].includes(n.official_status || ''));
        const resolved = narratives.filter(n => (n.official_status || '') === 'resolved');
        return [
            { title: "Pending Review", icon: ChatBubbleBottomCenterTextIcon, items: pending, color: "text-[var(--color-critical)]" },
            { title: "Active", icon: AdjustmentsHorizontalIcon, items: active, color: "text-blue-500" },
            { title: "Resolved", icon: ArchiveBoxIcon, items: resolved, color: "text-[var(--color-text-tertiary)]" }
        ];
    }, [narratives]);

    return (
        <div className="flex flex-col overflow-hidden bg-[var(--color-bg-surface)]" style={{ height: 'calc(100dvh - 96px)' }}>

            {/* Queue title — 68px */}
            <div className="shrink-0 p-4 border-b border-[var(--color-border-default)]">
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">Narrative Queue</h2>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                    AI-generated summaries across all neighborhoods.
                </p>
            </div>

            {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-brand-default)] border-t-transparent" />
                </div>
            ) : (
                <div className="flex flex-col flex-1">
                    {sections.map(section => {
                        const isOpen = activeSection === section.title;
                        return (
                            <div key={section.title} className="flex flex-col shrink-0 border-t border-[var(--color-border-subtle)]">

                                {/* Section header — ~48px, always visible */}
                                <button
                                    onClick={() => toggle(section.title)}
                                    className="w-full px-4 py-3 flex items-center justify-between bg-[var(--color-bg-canvas)] hover:bg-white/5 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        {isOpen
                                            ? <ChevronDownIcon className="h-3 w-3 text-[var(--color-text-tertiary)]" />
                                            : <ChevronRightIcon className="h-3 w-3 text-[var(--color-text-tertiary)]" />}
                                        <section.icon className={`h-4 w-4 ${section.color}`} />
                                        <span className={`text-[10px] font-black uppercase tracking-wider ${isOpen ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                                            {section.title}
                                        </span>
                                    </div>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${isOpen ? 'bg-[var(--color-brand-default)]/10 border-[var(--color-brand-default)]/30 text-[var(--color-brand-default)]' : 'bg-black/40 border-white/5 text-[var(--color-text-tertiary)]'}`}>
                                        {section.items.length}
                                    </span>
                                </button>

                                {/* Section content — explicit calc height so flex can't lie */}
                                {isOpen && (
                                    <div
                                        className="overflow-y-auto divide-y divide-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] custom-scrollbar"
                                        style={{ maxHeight: CONTENT_MAX_HEIGHT, WebkitOverflowScrolling: 'touch' }}
                                    >
                                        {section.items.length === 0 ? (
                                            <p className="px-5 py-10 text-[10px] italic text-center text-[var(--color-text-tertiary)]">
                                                No narratives in this status.
                                            </p>
                                        ) : (
                                            section.items.map(n => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => onSelect(n.id)}
                                                    className={`relative p-4 cursor-pointer transition-all hover:bg-[var(--color-bg-subtle)] ${selectedId === n.id ? "bg-[var(--color-brand-default)]/5 shadow-[inset_3px_0_0_var(--color-brand-default)]" : ""}`}
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
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
