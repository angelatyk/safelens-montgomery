"use client";

import { useState } from "react";
import LiveOpsQueue from "@/components/official/LiveOpsQueue";
import IncidentDetailPanel from "@/components/official/IncidentDetailPanel";

export default function OfficialOpsPage() {
    const [selectedIncident, setSelectedIncident] = useState<string | null>("1");

    return (
        <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-[var(--color-bg-canvas)] lg:flex-row">

            {/* Left Column: Live Ops Queue (Triage) */}
            <div className="flex w-full flex-col border-r border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/50 lg:w-96 xl:w-[420px]">
                <LiveOpsQueue onSelect={setSelectedIncident} selectedId={selectedIncident} />
            </div>

            {/* Right Column: AI Detail & Response Panel (Expanded for Triage focus) */}
            <div className="flex flex-1 flex-col bg-[var(--color-bg-surface)]/80 backdrop-blur-sm">
                <IncidentDetailPanel incidentId={selectedIncident} />
            </div>

        </div>
    );
}
