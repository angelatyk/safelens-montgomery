"use client";

import { useState, useEffect } from "react";
import {
    SparklesIcon,
    MapPinIcon,
    BoltIcon,
    ShieldCheckIcon,
    ChatBubbleLeftRightIcon,
    ExclamationTriangleIcon,
    DevicePhoneMobileIcon,
    GlobeAltIcon,
    NewspaperIcon,
    PaperAirplaneIcon,
    CheckCircleIcon,
    NoSymbolIcon,
    FlagIcon,
    ArchiveBoxIcon,
    ClockIcon,
    XMarkIcon
} from "@heroicons/react/24/outline";

interface NarrativeDetail {
    id: string;
    title: string;
    content: string;
    generated_at: string;
    official_status: string;
    official_update: string;
    official_notes: string;
    incident_count: number;
    news_count: number;
    resident_report_id: string | null;
    neighborhoods: { name: string } | null;
}

interface Comment {
    id: string;
    content: string;
    created_at: string;
    is_official: boolean;
    user_id: string;
}

interface FeedbackStats {
    total: number;
    accurate: number;
    notRelevant: number;
    recent: {
        total: number;
        accurate: number;
        notRelevant: number;
    }
}

interface Props {
    narrativeId: string | null;
    onUpdate?: (message: string) => void;
    onClose?: () => void;
}

export default function NarrativeDetailPanel({ narrativeId, onUpdate, onClose }: Props) {
    const [narrative, setNarrative] = useState<NarrativeDetail | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newOfficialNote, setNewOfficialNote] = useState("");
    const [officialUpdate, setOfficialUpdate] = useState("");
    const [pendingStatus, setPendingStatus] = useState("");
    const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const fetchComments = async (id: string) => {
        try {
            const res = await fetch(`/api/narratives/${id}/comments?official=true`);
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
            }
        } catch (err) {
            console.error("Failed to fetch comments", err);
        }
    };

    const fetchFeedback = async (id: string) => {
        try {
            const res = await fetch(`/api/narratives/${id}/feedback`);
            if (res.ok) {
                const data = await res.json();
                setFeedbackStats(data.stats);
            }
        } catch (err) {
            console.error("Failed to fetch feedback", err);
        }
    };

    const fetchDetail = async (id: string) => {
        setIsLoading(true);
        try {
            // In a real app, this would be a single detail endpoint
            const res = await fetch("/api/narratives");
            if (res.ok) {
                const data = await res.json();
                const found = data.narratives.find((n: NarrativeDetail) => n.id === id);
                if (found) {
                    setNarrative(found);
                    setOfficialUpdate(found.official_update || "");
                    setNewOfficialNote(found.official_notes || "");
                    setPendingStatus(found.official_status || "unreviewed");
                }
            }
            fetchComments(id);
            fetchFeedback(id);
        } catch (err) {
            console.error("Failed to fetch narrative detail", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (narrativeId) {
            fetchDetail(narrativeId);
        } else {
            setNarrative(null);
        }
    }, [narrativeId]);

    const handleUpdateRecord = async (overrideStatus?: string) => {
        if (!narrative) return;
        setIsUpdating(true);
        const statusToSubmit = overrideStatus || pendingStatus;
        try {
            const res = await fetch(`/api/narratives/${narrative.id}/verify`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    officialStatus: statusToSubmit,
                    officialUpdate: officialUpdate,
                    officialNotes: newOfficialNote
                })
            });
            if (res.ok) {
                setNarrative(prev => prev ? {
                    ...prev,
                    official_status: statusToSubmit,
                    official_update: officialUpdate,
                    official_notes: newOfficialNote
                } : null);
                if (overrideStatus) setPendingStatus(overrideStatus);
                if (onUpdate) {
                    onUpdate(overrideStatus === 'resolved' ? "Narrative Resolved" : "Record Updated");
                }
            }
        } catch (err) {
            console.error("Update failed", err);
        } finally {
            setIsUpdating(false);
        }
    };

    if (!narrativeId) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center bg-[var(--color-bg-canvas)]/30">
                <div className="space-y-4 max-w-xs">
                    <ShieldCheckIcon className="mx-auto h-12 w-12 text-[var(--color-text-tertiary)] opacity-20" />
                    <p className="text-sm text-[var(--color-text-tertiary)] font-medium">
                        Select a narrative from the queue to view AI situational analysis and official controls.
                    </p>
                </div>
            </div>
        );
    }

    if (isLoading || !narrative) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-brand-default)] border-t-transparent" />
            </div>
        );
    }

    // AI Derived Severity (Placeholder Logic)
    const severityScore = (narrative.incident_count * 2) + narrative.news_count + (narrative.resident_report_id ? 3 : 0);
    const severityLabel = severityScore > 8 ? "Critical" : severityScore > 4 ? "High" : "Routine";
    const severityColor = severityScore > 8 ? "text-red-400" : severityScore > 4 ? "text-orange-400" : "text-blue-400";

    return (
        <div className="flex h-full flex-col overflow-hidden bg-[var(--color-bg-surface)]">
            {/* Header */}
            <div className="border-b border-[var(--color-border-default)] bg-purple-500/5 p-6 shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-purple-400">
                        <SparklesIcon className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">AI Situational Summary</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                            {narrative.official_status || 'unreviewed'}
                        </span>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
                                title="Close Detail"
                            >
                                <XMarkIcon className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[var(--color-text-tertiary)]">
                    <span className="flex items-center gap-1">
                        <MapPinIcon className="h-3 w-3" />
                        {narrative.neighborhoods?.name || "Global"}
                    </span>
                    <span className="font-mono">
                        ID: {narrative.id.slice(0, 8)}
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

                {/* Content Section */}
                <section className="space-y-3">
                    <h2 className="text-xl font-bold text-white leading-tight">
                        {narrative.title || "Safety Intelligence Summary"}
                    </h2>
                    <p className="text-sm leading-relaxed text-[var(--color-navy-100)]">
                        {narrative.content}
                    </p>
                </section>

                {/* Data Sources Grid */}
                <section className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-tight">Linked Data Sources</h3>
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-[var(--radius-sm)] bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                            <ExclamationTriangleIcon className="h-4 w-4 text-orange-400" />
                            <span className="text-lg font-bold">{narrative.incident_count}</span>
                            <span className="text-[9px] uppercase tracking-tighter text-[var(--color-text-tertiary)]">Incidents</span>
                        </div>
                        <div className="p-3 rounded-[var(--radius-sm)] bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                            <NewspaperIcon className="h-4 w-4 text-blue-400" />
                            <span className="text-lg font-bold">{narrative.news_count}</span>
                            <span className="text-[9px] uppercase tracking-tighter text-[var(--color-text-tertiary)]">News Articles</span>
                        </div>
                        <div className="p-3 rounded-[var(--radius-sm)] bg-white/5 border border-white/5 flex flex-col items-center gap-1">
                            <DevicePhoneMobileIcon className="h-4 w-4 text-green-400" />
                            <span className="text-lg font-bold">{narrative.resident_report_id ? 1 : 0}</span>
                            <span className="text-[9px] uppercase tracking-tighter text-[var(--color-text-tertiary)] text-center">Resident Reports</span>
                        </div>
                    </div>
                </section>

                {/* Severity Insight */}
                <section className="space-y-3 p-4 rounded-[var(--radius-md)] bg-indigo-500/5 border border-indigo-500/10">
                    <div className="flex items-center gap-2 text-indigo-300 mb-1">
                        <BoltIcon className="h-4 w-4" />
                        <h3 className="text-xs font-bold uppercase tracking-tight">AI Severity Insight</h3>
                    </div>
                    <p className="text-xs leading-relaxed text-[var(--color-navy-200)]">
                        {severityScore > 8
                            ? "CRITICAL: Significant resource convergence with media coverage. Immediate official response recommended."
                            : severityScore > 4
                                ? "MODERATE: Multiple reports confirmed. Monitoring advised."
                                : "ROUTINE: Monitoring continue for escalation."}
                    </p>
                    {feedbackStats && (
                        <div className="mt-2 text-[10px] text-indigo-200/70 border-t border-indigo-500/10 pt-2 flex items-center gap-2">
                            <ChatBubbleLeftRightIcon className="h-3 w-3" />
                            <span>In the last 15 minutes, <span className="text-red-400 font-bold">{feedbackStats.recent.accurate} confirmed</span> still ongoing while <span className="text-green-400 font-bold">{feedbackStats.recent.notRelevant} flagged</span> no longer active.</span>
                        </div>
                    )}
                </section>

                {/* Resident Comments */}
                {comments.filter(c => !c.is_official).length > 0 && (
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-tight">Resident Comments</h3>
                            <span className="text-[10px] text-[var(--color-text-tertiary)]">{comments.filter(c => !c.is_official).length} Public</span>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {comments.filter(c => !c.is_official).map((comment) => (
                                <div key={comment.id} className="p-3 rounded-[var(--radius-sm)] bg-white/5 border border-white/5 space-y-1">
                                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{comment.content}</p>
                                    <div className="flex justify-between items-center text-[9px] text-[var(--color-text-tertiary)]">
                                        <span>UserID: {comment.user_id?.slice(0, 8)}...</span>
                                        <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Official Interaction Form Area */}
                <div className="space-y-6 pt-6 border-t border-white/5">

                    {/* Public Update */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-blue-300 uppercase tracking-tight">Public Update Note</h3>
                            <span className="text-[9px] text-[var(--color-text-tertiary)]">Visible to Residents</span>
                        </div>
                        <textarea
                            value={officialUpdate}
                            onChange={(e) => setOfficialUpdate(e.target.value)}
                            placeholder="Write a status update for the public feed..."
                            className="w-full h-20 rounded-[var(--radius-sm)] bg-white/5 border border-white/10 p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                        />
                    </section>

                    {/* Official Comments */}
                    <section className="space-y-3">
                        <h3 className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-tight">Official Comments (Internal)</h3>
                        <textarea
                            value={newOfficialNote}
                            onChange={(e) => setNewOfficialNote(e.target.value)}
                            placeholder="Internal coordination notes..."
                            className="w-full h-24 rounded-[var(--radius-sm)] bg-black/20 border border-white/5 p-3 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-white/20"
                        />
                    </section>

                    {/* Action Buttons */}
                    <section className="space-y-4 pb-8">
                        <div>
                            <h3 className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-tight mb-3">Status</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPendingStatus('acknowledged')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-sm)] border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${pendingStatus === 'acknowledged'
                                        ? 'bg-white text-black border-white'
                                        : 'border-white/10 text-white hover:bg-white/5'
                                        }`}
                                >
                                    <FlagIcon className="h-3.5 w-3.5" />
                                    Acknowledge
                                </button>
                                <button
                                    onClick={() => setPendingStatus('verified')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-sm)] border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${pendingStatus === 'verified'
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'
                                        }`}
                                >
                                    <CheckCircleIcon className="h-3.5 w-3.5" />
                                    Verify
                                </button>
                                <button
                                    onClick={() => setPendingStatus('dispatched')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-[var(--radius-sm)] border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${pendingStatus === 'dispatched'
                                        ? 'bg-[var(--color-brand-default)] text-white border-[#3B82F6]'
                                        : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10'
                                        }`}
                                >
                                    <PaperAirplaneIcon className="h-3.5 w-3.5" />
                                    Dispatch
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-white/5">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => handleUpdateRecord()}
                                    disabled={isUpdating}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[var(--radius-sm)] bg-white text-black text-[12px] font-black uppercase tracking-[0.2em] hover:brightness-110 transition-all shadow-xl disabled:opacity-50 cursor-pointer"
                                >
                                    {isUpdating ? "Updating..." : "Update"}
                                </button>

                                <button
                                    onClick={() => handleUpdateRecord('resolved')}
                                    disabled={isUpdating}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-[var(--radius-sm)] bg-green-600 border border-green-500 text-[11px] font-black text-white uppercase tracking-[0.15em] hover:bg-green-500 transition-all cursor-pointer"
                                >
                                    <ArchiveBoxIcon className="h-4 w-4" />
                                    {isUpdating ? "Resolving..." : "Mark as Resolved"}
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[var(--color-border-default)] p-4 bg-black/20 shrink-0">
                <div className="flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-tight">
                    <span className="flex items-center gap-2">
                        <ChatBubbleLeftRightIcon className="h-3 w-3" />
                        {comments.length} Resident Comments
                    </span>
                    <span>Last Update: {new Date(narrative.generated_at).toLocaleTimeString()}</span>
                </div>
            </div>
        </div>
    );
}
