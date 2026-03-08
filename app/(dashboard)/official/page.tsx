"use client";

import { useState, useEffect } from "react";
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
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [activeTab] = useState<Tab>("narratives");

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleRefresh = (msg?: string) => {
        setRefreshTrigger(prev => prev + 1);
        if (msg) setToast({ message: msg, type: 'success' });
    };

    const handleClose = () => {
        setSelectedNarrativeId(null);
    };

    return (
        <div className="flex h-[calc(100vh-64px)] flex-col overflow-hidden bg-[var(--color-bg-canvas)] lg:flex-row relative">

            {/* Global Toast Notification */}
            {toast && (
                <div className="fixed top-20 right-6 z-[100] animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className={`
                        px-4 py-2 rounded-[var(--radius-sm)] shadow-lg border flex items-center gap-2 text-xs font-bold uppercase tracking-wider backdrop-blur-md
                        ${toast.type === 'success'
                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-400'}
                    `}>
                        {toast.type === 'success' ? <CheckCircleIcon className="h-4 w-4" /> : <NoSymbolIcon className="h-4 w-4" />}
                        {toast.message}
                    </div>
                </div>
            )}

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
                        refreshTrigger={refreshTrigger}
                    />
                </div>
            </div>

            {/* Right Column: AI Detail & Response Panel */}
            <div className="flex flex-1 flex-col bg-[var(--color-bg-surface)]/80 backdrop-blur-sm">
                <NarrativeDetailPanel
                    narrativeId={selectedNarrativeId}
                    onUpdate={(msg: string) => handleRefresh(msg)}
                    onClose={handleClose}
                />
            </div>

        </div>
    );
}
