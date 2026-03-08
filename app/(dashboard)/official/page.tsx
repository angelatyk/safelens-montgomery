"use client";

import { useState } from "react";
import OfficialNarrativeQueue from "@/components/official/OfficialNarrativeQueue";

type Tab = "narratives";

export default function OfficialOpsPage() {
    const [selectedNarrativeId, setSelectedNarrativeId] = useState<string | null>(null);
    const [activeTab] = useState<Tab>("narratives");

    return (
        <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-[var(--color-bg-canvas)] lg:flex-row">

            {/* Left Column: Queue */}
            <div className="flex w-full flex-col border-r border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/50 lg:w-96 xl:w-[420px]">
                {/* Tab bar — kept for future tabs */}
                <div className="flex border-b border-[var(--color-border-default)]">
                    <button
                        className="flex-1 py-3 text-xs font-bold uppercase tracking-wider bg-[var(--color-brand-default)] text-white cursor-default"
                    >
                        Narrative Review
                    </button>
                </div>

                <div className="flex-1 overflow-hidden">
                    <OfficialNarrativeQueue
                        selectedId={selectedNarrativeId}
                        onSelect={setSelectedNarrativeId}
                    />
                </div>
            </div>

            {/* Right Column: Detail Panel (placeholder until Phase 3) */}
            <div className="flex flex-1 flex-col bg-[var(--color-bg-surface)]/80 backdrop-blur-sm">
                {!selectedNarrativeId ? (
                    <div className="flex h-full items-center justify-center p-8 text-center">
                        <div className="space-y-3 opacity-40">
                            <div className="mx-auto h-10 w-10 rounded-full border-2 border-[var(--color-text-tertiary)] flex items-center justify-center">
                                <span className="text-lg">✦</span>
                            </div>
                            <p className="text-sm text-[var(--color-text-tertiary)]">
                                Select a narrative from the queue to begin review.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center p-8 text-center">
                        <p className="text-sm text-[var(--color-text-tertiary)]">
                            Detail panel coming in Phase 3 — narrative <span className="font-mono text-[var(--color-brand-default)]">{selectedNarrativeId.slice(0, 8)}…</span> selected.
                        </p>
                    </div>
                )}
            </div>

        </div>
    );
}
