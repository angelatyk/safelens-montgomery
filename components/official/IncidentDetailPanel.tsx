"use client";

import {
    SparklesIcon,
    MapPinIcon,
    BoltIcon,
    ShieldCheckIcon,
    FlagIcon,
    ChevronRightIcon
} from "@heroicons/react/24/outline";

interface IncidentDetailPanelProps {
    incidentId: string | null;
}

export default function IncidentDetailPanel({ incidentId }: IncidentDetailPanelProps) {
    if (!incidentId) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center">
                <div className="space-y-4">
                    <ShieldCheckIcon className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)] opacity-20" />
                    <p className="text-sm text-[var(--color-text-tertiary)]">
                        Select an incident from the queue to view AI situational analysis and response controls.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            {/* AI Header */}
            <div className="border-b border-[var(--color-border-default)] bg-purple-500/5 p-6">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                    <SparklesIcon className="h-5 w-5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Situational Summary</span>
                </div>
                <h2 className="text-lg font-bold text-white leading-tight">
                    Civil Disturbance: Market & 5th
                </h2>
                <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                    INCIDENT ID: #MC-8842-D | STATUS: Dispatch Pending
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">

                {/* Pre-dispatch summary */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-purple-200 uppercase tracking-tight">Pre-dispatch Summary</h3>
                    <p className="text-sm leading-relaxed text-[var(--color-navy-100)] italic">
                        "Multiple eyewitnesses report a non-violent but escalating verbal confrontation between two large groups. Current social sentiment in the immediate 2-block radius has dropped by 18% in the last 15 minutes. No weapon sightings confirmed, but acoustic sensors detected high-decibel glass breakage at 14:02."
                    </p>
                </section>

                {/* Why this matters */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-indigo-200 uppercase tracking-tight">Why this matters</h3>
                    <ul className="space-y-4">
                        <li className="flex gap-3">
                            <MapPinIcon className="h-5 w-5 shrink-0 text-indigo-400" />
                            <p className="text-xs text-[var(--color-navy-200)]">
                                This intersection is a primary exit for the afternoon commute. Unresolved escalation within the next 20 minutes is likely to impact public transit flow.
                            </p>
                        </li>
                        <li className="flex gap-3">
                            <BoltIcon className="h-5 w-5 shrink-0 text-indigo-400" />
                            <p className="text-xs text-[var(--color-navy-200)]">
                                Increased safety anxiety for ~2,400 expected pedestrians.
                            </p>
                        </li>
                    </ul>
                </section>

                {/* Response Controls */}
                <section className="space-y-4 pt-4">
                    <div className="flex gap-2">
                        <button className="flex-1 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] py-2 text-xs font-bold text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-bg-subtle)] cursor-pointer">
                            <FlagIcon className="h-4 w-4" />
                            Flag
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-brand-default)] py-2 text-xs font-bold text-white shadow-lg shadow-[var(--color-brand-default)]/20 transition-all hover:bg-blue-600 cursor-pointer">
                            Deploy Unit
                        </button>
                    </div>
                    <button className="flex w-full items-center justify-between rounded-[var(--radius-sm)] bg-white/5 px-4 py-3 text-xs font-bold text-[var(--color-text-secondary)] transition-all hover:bg-white/10 cursor-pointer">
                        View Live Camera Feed
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                </section>

            </div>

            {/* Footer System Status */}
            <div className="border-t border-[var(--color-border-default)] p-4 bg-black/20">
                <div className="flex items-center justify-between text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-tighter">
                    <span>Linked Units: 0</span>
                    <span>Last Intelligence Sync: Just now</span>
                </div>
            </div>
        </div>
    );
}
