"use client";

import { useState } from "react";
import {
    UserIcon,
    GlobeAltIcon,
    CpuChipIcon,
    CheckCircleIcon,
    ClockIcon
} from "@heroicons/react/24/outline";

interface LiveOpsQueueProps {
    onSelect: (id: string) => void;
    selectedId: string | null;
}

const TABS = [
    { id: "resident", name: "Resident Reports", icon: UserIcon as React.ElementType, count: 12 },
    { id: "web", name: "Web Intel (Bright Data)", icon: GlobeAltIcon as React.ElementType, count: 8 },
    { id: "system", name: "System Alerts", icon: CpuChipIcon as React.ElementType, count: 3 },
];

const MOCK_REPORTS = [
    {
        id: "1",
        priority: "CRITICAL",
        title: "Civil Disturbance: Market & 5th",
        source: "Mobile App",
        time: "2 mins ago",
        status: "Pending",
        summary: "Multiple reports of loud arguments and glass breaking near the transit hub."
    },
    {
        id: "2",
        priority: "HIGH",
        title: "Bright Data Intel: Social Escalation",
        source: "Web Intelligence",
        time: "8 mins ago",
        status: "Processing",
        summary: "Aggregated web data shows sudden spike in keywords 'blocked' and 'protest' near City Hall."
    },
    {
        id: "3",
        priority: "ROUTINE",
        title: "Street Light Outage: Montgomery Blvd",
        source: "Sentinel Vision",
        time: "14 mins ago",
        status: "Auto-logged",
        summary: "Auto-generated via Sentinel Vision system. Pole ID #7721 flickering. Safety impact: Low."
    }
];

export default function LiveOpsQueue({ onSelect, selectedId }: LiveOpsQueueProps) {
    const [activeTab, setActiveTab] = useState("resident");

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg-surface)]">
            {/* Tabs Header */}
            <div className="border-b border-[var(--color-border-default)] px-4 pt-4">
                <div className="flex gap-4">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                flex items-center gap-2 border-b-2 pb-3 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer
                ${activeTab === tab.id
                                    ? "border-[var(--color-brand-default)] text-[var(--color-brand-default)]"
                                    : "border-transparent text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"}
              `}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.name}
                            <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${activeTab === tab.id ? "bg-[var(--color-brand-default)]/20" : "bg-white/5"}`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Search & Filter */}
            <div className="p-4 border-b border-[var(--color-border-subtle)]">
                <input
                    type="text"
                    placeholder="Filter queue..."
                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-inset)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-brand-default)]"
                />
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto">
                {MOCK_REPORTS.map((report) => (
                    <div
                        key={report.id}
                        onClick={() => onSelect(report.id)}
                        className={`
              group border-b border-[var(--color-border-subtle)] p-4 transition-all cursor-pointer hover:bg-[var(--color-bg-subtle)]
              ${selectedId === report.id ? "bg-[var(--color-brand-default)]/5 shadow-inner" : ""}
            `}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <span className={`text-[9px] font-black uppercase tracking-widest ${report.priority === "CRITICAL" ? "text-[var(--color-critical)]" :
                                report.priority === "HIGH" ? "text-orange-500" : "text-blue-500"
                                }`}>
                                {report.priority}
                            </span>
                            <span className="text-[10px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                                <ClockIcon className="h-3 w-3" />
                                {report.time}
                            </span>
                        </div>
                        <h3 className={`text-sm font-bold truncate ${selectedId === report.id ? "text-[var(--color-brand-default)]" : "text-[var(--color-text-primary)]"}`}>
                            {report.title}
                        </h3>
                        <p className="mt-1 text-xs text-[var(--color-text-tertiary)] line-clamp-2 leading-relaxed">
                            {report.summary}
                        </p>
                        <div className="mt-3 flex items-center justify-between">
                            <span className="text-[10px] text-[var(--color-text-tertiary)] flex items-center gap-1">
                                Source: <span className="font-semibold text-[var(--color-text-secondary)]">{report.source}</span>
                            </span>
                            {report.status === "Processing" && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-blue-400">
                                    <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                                    ANALYZING
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer Info */}
            <div className="border-t border-[var(--color-border-default)] p-4 bg-[var(--color-bg-canvas)]/50">
                <div className="flex items-center justify-between text-[10px] font-medium text-[var(--color-text-tertiary)]">
                    <span>Active Agents: 4</span>
                    <span>System Health: Nominal</span>
                </div>
            </div>
        </div>
    );
}
