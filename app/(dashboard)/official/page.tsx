"use client";

import { useState } from "react";
import {
    CheckCircleIcon,
    NoSymbolIcon,
    FlagIcon,
    ArchiveBoxIcon
} from "@heroicons/react/24/outline";
import OfficialNarrativeQueue from "@/components/official/OfficialNarrativeQueue";
import NarrativeDetailPanel from "@/components/official/NarrativeDetailPanel";

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

            {/* Right Column: AI Detail & Response Panel */}
            <div className="flex flex-1 flex-col bg-[var(--color-bg-surface)]/80 backdrop-blur-sm">
                <NarrativeDetailPanel narrativeId={selectedNarrativeId} />
            </div>

        </div>
    );
}
