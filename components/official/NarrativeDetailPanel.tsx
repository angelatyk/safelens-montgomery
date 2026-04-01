"use client";

import { useState, useEffect, useRef } from "react";
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
    XMarkIcon,
    UserCircleIcon,
    ArrowTopRightOnSquareIcon
} from "@heroicons/react/24/outline";
import { useUser } from "@/lib/context/UserContext";

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
    user_id?: string;
    display_name?: string | null;
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

interface LinkedIncident {
    id: string;
    type: string;
    source: string | null;
    headline: string | null;
    severity: string | null;
    credibility_score: number | null;
    occurred_at: string | null;
    neighborhood: string | null;
}

interface LinkedArticle {
    id: string;
    headline: string;
    source: string | null;
    url: string | null;
    published_at: string | null;
    relevance_score: number;
}

interface LinkedReport {
    id: string;
    category: string;
    description: string | null;
    status: string;
    created_at: string;
}

interface SourceData {
    incidents: LinkedIncident[];
    articles: LinkedArticle[];
    residentReport: LinkedReport | null;
}

interface PublicUpdate {
    id: string;
    content: string;
    created_at: string;
    user_id?: string;
    display_name?: string | null;
}


interface Props {
    narrativeId: string | null;
    onUpdate?: (message: string) => void;
    onClose?: () => void;
}

export default function NarrativeDetailPanel({ narrativeId, onUpdate, onClose }: Props) {
    const { user, supabase } = useUser();
    const [narrative, setNarrative] = useState<NarrativeDetail | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [publicUpdates, setPublicUpdates] = useState<PublicUpdate[]>([]);
    const [newOfficialNote, setNewOfficialNote] = useState("");
    const [officialUpdate, setOfficialUpdate] = useState("");
    const [pendingStatus, setPendingStatus] = useState("");
    const [feedbackStats, setFeedbackStats] = useState<FeedbackStats | null>(null);
    const [sources, setSources] = useState<SourceData | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notFound, setNotFound] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchComments = async (id: string, signal?: AbortSignal) => {
        try {
            const res = await fetch(`/api/narratives/${id}/comments?official=true`, { signal });
            if (res.ok) {
                const data = await res.json();
                setComments(data.comments || []);
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') console.error("Failed to fetch comments", err);
        }
    };

    const fetchPublicUpdates = async (id: string, signal?: AbortSignal) => {
        try {
            const res = await fetch(`/api/narratives/${id}/public-updates`, { signal });
            if (res.ok) {
                const data = await res.json();
                setPublicUpdates(data.updates || []);
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') console.error("Failed to fetch public updates", err);
        }
    };

    const fetchFeedback = async (id: string, signal?: AbortSignal) => {
        try {
            const res = await fetch(`/api/narratives/${id}/feedback`, { signal });
            if (res.ok) {
                const data = await res.json();
                setFeedbackStats(data.stats);
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') console.error("Failed to fetch feedback", err);
        }
    };

    const fetchSources = async (id: string, signal?: AbortSignal) => {
        try {
            const res = await fetch(`/api/narratives/${id}/sources`, { signal });
            if (res.ok) {
                const data = await res.json();
                setSources(data);
            }
        } catch (err: any) {
            if (err?.name !== 'AbortError') console.error("Failed to fetch sources", err);
        }
    };

    const fetchDetail = async (id: string, signal: AbortSignal) => {
        setIsLoading(true);
        setNotFound(false);
        try {
            const res = await fetch(`/api/narratives/${id}`, { signal });
            if (res.ok) {
                const data = await res.json();
                setNarrative(data);
                setOfficialUpdate("");
                setNewOfficialNote("");
                setPendingStatus(data.official_status || "unreviewed");
            } else if (res.status === 404) {
                setNarrative(null);
                setNotFound(true);
            }
            // Fire sub-fetches in parallel, all sharing the same abort signal
            fetchComments(id, signal);
            fetchPublicUpdates(id, signal);
            fetchFeedback(id, signal);
            fetchSources(id, signal);
        } catch (err: any) {
            if (err?.name !== 'AbortError') {
                console.error("Failed to fetch narrative detail", err);
            }
        } finally {
            if (!signal.aborted) {
                setIsLoading(false);
            }
        }
    };

    useEffect(() => {
        // Abort any in-flight fetch from the previous selection
        abortControllerRef.current?.abort();

        if (narrativeId) {
            const controller = new AbortController();
            abortControllerRef.current = controller;
            setSources(null);
            fetchDetail(narrativeId, controller.signal);
        } else {
            abortControllerRef.current = null;
            setNarrative(null);
            setSources(null);
            setNotFound(false);
        }

        return () => {
            abortControllerRef.current?.abort();
        };
    }, [narrativeId]);

    const handleUpdateRecord = async (overrideStatus?: string) => {
        if (!narrative) return;
        setIsUpdating(true);
        const statusToSubmit = overrideStatus || pendingStatus;
        try {
            // 1. Update Status (always)
            const verifyRes = await fetch(`/api/narratives/${narrative.id}/verify`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    officialStatus: statusToSubmit
                })
            });

            // 2. Submit Public Update (if text exists)
            let updateOk = true;
            if (officialUpdate.trim()) {
                const pubRes = await fetch(`/api/narratives/${narrative.id}/public-updates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: officialUpdate,
                        userId: user?.id
                    })
                });
                updateOk = pubRes.ok;
            }

            // 3. Submit Internal Comment (if text exists)
            let commentOk = true;
            if (newOfficialNote.trim()) {
                const commRes = await fetch(`/api/narratives/${narrative.id}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        content: newOfficialNote,
                        isOfficial: true,
                        userId: user?.id
                    })
                });
                commentOk = commRes.ok;
            }

            if (verifyRes.ok && updateOk && commentOk) {
                setNarrative(prev => prev ? {
                    ...prev,
                    official_status: statusToSubmit
                } : null);

                // Clear inputs and refresh threads
                setOfficialUpdate("");
                setNewOfficialNote("");
                fetchComments(narrative.id);
                fetchPublicUpdates(narrative.id);

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

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-brand-default)] border-t-transparent" />
            </div>
        );
    }

    if (notFound || !narrative) {
        return (
            <div className="flex h-full items-center justify-center p-8 text-center">
                <div className="space-y-3 max-w-xs">
                    <ExclamationTriangleIcon className="mx-auto h-10 w-10 text-[var(--color-text-tertiary)] opacity-30" />
                    <p className="text-sm text-[var(--color-text-tertiary)] font-medium">Narrative not found or no longer available.</p>
                </div>
            </div>
        );
    }

    // AI Derived Severity (Placeholder Logic)
    const severityScore = (narrative.incident_count * 2) + narrative.news_count + (narrative.resident_report_id ? 3 : 0);
    const severityLabel = severityScore > 8 ? "Critical" : severityScore > 4 ? "High" : "Routine";
    const severityColor = severityScore > 8 ? "text-red-400" : severityScore > 4 ? "text-orange-400" : "text-blue-400";

    return (
        <div className="flex flex-col overflow-hidden bg-[var(--color-bg-surface)]" style={{ height: 'calc(100dvh - 96px)' }}>
            {/* Sticky Header — always visible while scrolling */}
            <div className="border-b border-[var(--color-border-default)] bg-purple-500/5 px-6 pt-5 pb-4 shrink-0">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-purple-400 mb-1">
                            <SparklesIcon className="h-4 w-4 shrink-0" />
                            <span className="text-[9px] font-black uppercase tracking-[0.2em]">AI Situational Summary</span>
                        </div>
                        <h2 className="text-base font-bold text-white leading-tight truncate">
                            {narrative.title || "Safety Intelligence Summary"}
                        </h2>
                        <div className="flex items-center gap-4 text-[10px] text-[var(--color-text-tertiary)] mt-1">
                            <span className="flex items-center gap-1">
                                <MapPinIcon className="h-3 w-3" />
                                {narrative.neighborhoods?.name || "Global"}
                            </span>
                            <span className="font-mono">ID: {narrative.id.slice(0, 8)}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>

                {/* Content Section — AI Narrative (no title, it's in the header) */}
                <section className="space-y-2">
                    <p className="text-sm leading-relaxed text-[var(--color-navy-100)]">
                        {narrative.content}
                    </p>
                </section>

                {/* Data Sources Grid — live counts from junction tables */}
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
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-[var(--color-text-secondary)] uppercase tracking-tight">Resident Comments</h3>
                        {comments.filter(c => !c.is_official).length > 0 && (
                            <span className="text-[10px] text-[var(--color-text-tertiary)]">{comments.filter(c => !c.is_official).length} Public</span>
                        )}
                    </div>
                    <div className="space-y-0 max-h-48 overflow-y-auto pr-2 custom-scrollbar bg-black/10 rounded-[var(--radius-sm)] border border-white/5">
                        {comments.filter(c => !c.is_official).length === 0 ? (
                            <p className="text-[10px] italic text-[var(--color-text-tertiary)] text-center py-4">No resident comments yet.</p>
                        ) : (
                            comments.filter(c => !c.is_official).map((comment) => (
                                <div key={comment.id} className="p-3 border-b border-white/5 last:border-0 space-y-1">
                                    <div className="flex justify-between items-center text-[9px]">
                                        <span className="font-bold text-[var(--color-text-secondary)]">{comment.display_name || `Resident ${comment.user_id?.slice(0, 5) || 'Unknown'}`}</span>
                                        <span className="text-[var(--color-text-tertiary)]">{new Date(comment.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                    </div>
                                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{comment.content}</p>
                                </div>
                            ))
                        )}
                    </div>
                </section>

                {/* Official Interaction Form Area */}
                <div className="space-y-6 pt-6 border-t border-white/5">

                    {/* Public Update Section */}
                    <section className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-blue-300 uppercase tracking-tight">Public Update Note</h3>
                            <span className="text-[9px] text-[var(--color-text-tertiary)]">Visible to Residents</span>
                        </div>

                        <textarea
                            value={officialUpdate}
                            onChange={(e) => setOfficialUpdate(e.target.value)}
                            placeholder="Write a new status update for the public feed..."
                            className="w-full h-16 rounded-[var(--radius-sm)] bg-white/5 border border-white/10 p-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                        />

                        {/* Public History */}
                        <div className="space-y-0 max-h-48 overflow-y-auto pr-2 custom-scrollbar bg-blue-500/5 rounded-[var(--radius-sm)] border border-blue-500/10">
                            {publicUpdates.length === 0 ? (
                                <p className="text-[10px] italic text-blue-300/40 text-center py-4">No past public updates yet.</p>
                            ) : (
                                publicUpdates.map((update) => (
                                    <div key={update.id} className="p-3 border-b border-blue-500/10 last:border-0 space-y-2">
                                        <div className="flex justify-between items-center text-[9px]">
                                            <div className="flex items-center gap-1.5 font-bold text-blue-300">
                                                <UserCircleIcon className="h-3 w-3" />
                                                <span>{update.display_name || "Unknown Official"}</span>
                                            </div>
                                            <span className="text-blue-300/40">{new Date(update.content ? update.created_at : Date.now()).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        </div>
                                        <p className="text-xs text-blue-100/90 leading-relaxed font-medium">{update.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Internal Comments Thread */}
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold text-[var(--color-text-tertiary)] uppercase tracking-tight">Internal Comments</h3>

                        <textarea
                            value={newOfficialNote}
                            onChange={(e) => setNewOfficialNote(e.target.value)}
                            placeholder="Add an internal coordination note..."
                            className="w-full h-20 rounded-[var(--radius-sm)] bg-black/20 border border-white/5 p-3 text-xs text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-white/20"
                        />

                        {/* Internal History */}
                        <div className="space-y-0 max-h-60 overflow-y-auto pr-2 custom-scrollbar bg-black/10 rounded-[var(--radius-sm)] border border-white/5">
                            {comments.filter(c => c.is_official).length === 0 ? (
                                <p className="text-[10px] italic text-[var(--color-text-tertiary)] text-center py-4">No internal notes yet.</p>
                            ) : (
                                comments.filter(c => c.is_official).map((comment) => (
                                    <div key={comment.id} className="p-3 border-b border-white/5 last:border-0 space-y-2">
                                        <div className="flex justify-between items-center text-[9px]">
                                            <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                                                <UserCircleIcon className="h-3 w-3" />
                                                <span>{comment.display_name || "Unknown Official"}</span>
                                            </div>
                                            <span className="text-[var(--color-text-tertiary)]">{new Date(comment.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                        </div>
                                        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">{comment.content}</p>
                                    </div>
                                ))
                            )}
                        </div>
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
                    </section>
                </div>
            </div>

            {/* Fixed Action Bar — always visible above footer */}
            <div className="border-t border-[var(--color-border-default)] bg-[var(--color-bg-surface)] px-6 py-3 flex gap-3 shrink-0">
                <button
                    onClick={() => handleUpdateRecord()}
                    disabled={isUpdating}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold py-2.5 rounded-[var(--radius-sm)] shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2"
                >
                    {isUpdating ? "Syncing..." : "Update Narrative"}
                </button>
                <button
                    onClick={() => handleUpdateRecord('resolved')}
                    disabled={isUpdating}
                    className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs font-bold py-2.5 rounded-[var(--radius-sm)] border border-green-500/20 transition-all flex items-center justify-center gap-2"
                >
                    Mark as Resolved
                </button>
            </div>

            <div className="border-t border-[var(--color-border-default)] bg-black/20 px-6 py-2 shrink-0">
                <div className="flex items-center justify-around text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{comments.filter(c => !c.is_official).length}</span>
                        Resident Comments
                    </span>
                    <div className="w-px h-4 bg-white/10" />
                    <span className="flex items-center gap-1.5">
                        <span className="font-bold text-blue-300">{publicUpdates.length}</span>
                        Public Updates
                    </span>
                    <div className="w-px h-4 bg-white/10" />
                    <span className="flex items-center gap-1.5">
                        <span className="font-bold text-indigo-300">{comments.filter(c => c.is_official).length}</span>
                        Internal Comments
                    </span>
                </div>
            </div>
        </div>
    );
}
