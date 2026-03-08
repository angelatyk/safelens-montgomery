"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
    XMarkIcon,
    ShieldExclamationIcon,
    MapPinIcon,
    ChatBubbleBottomCenterTextIcon,
    PaperAirplaneIcon,
    ExclamationTriangleIcon,
    PencilSquareIcon,
    EyeIcon,
    PaintBrushIcon,
    SpeakerWaveIcon,
    WrenchScrewdriverIcon,
    EllipsisHorizontalIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";

interface ReportIncidentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PRESET_CATEGORIES = [
    "Suspicious Activity",
    "Vandalism",
    "Noise Complaint",
    "Maintenance Issue",
    "Other",
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
    "Suspicious Activity": EyeIcon,
    "Vandalism": PaintBrushIcon,
    "Noise Complaint": SpeakerWaveIcon,
    "Maintenance Issue": WrenchScrewdriverIcon,
    "Other": EllipsisHorizontalIcon,
};

interface NominatimResult {
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
}

export default function ReportIncidentModal({
    isOpen,
    onClose,
    onSuccess,
}: ReportIncidentModalProps) {
    const [category, setCategory] = useState(PRESET_CATEGORIES[0]);
    const [customCategory, setCustomCategory] = useState("");
    const [location, setLocation] = useState("");
    const [locationInput, setLocationInput] = useState("");
    const [addressSuggestions, setAddressSuggestions] = useState<NominatimResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [description, setDescription] = useState("");
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
    const locationRef = useRef<HTMLDivElement>(null);

    useEffect(() => { setMounted(true); }, []);

    // Lock body scroll
    useEffect(() => {
        if (isOpen) { document.body.style.overflow = "hidden"; }
        else { document.body.style.overflow = ""; }
        return () => { document.body.style.overflow = ""; };
    }, [isOpen]);

    // Escape key to close
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    // Close address dropdown on outside click
    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    // Address autocomplete via OpenStreetMap Nominatim (free, no API key)
    const fetchAddresses = useCallback(async (query: string) => {
        if (query.length < 3) { setAddressSuggestions([]); return; }
        try {
            const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Montgomery, AL")}&format=json&limit=5&countrycodes=us`;
            const res = await fetch(url, { headers: { "Accept-Language": "en" } });
            const data: NominatimResult[] = await res.json();
            setAddressSuggestions(data);
            setShowSuggestions(data.length > 0);
        } catch {
            setAddressSuggestions([]);
        }
    }, []);

    const handleLocationChange = (value: string) => {
        setLocationInput(value);
        setLocation(value);
        if (searchDebounce.current) clearTimeout(searchDebounce.current);
        searchDebounce.current = setTimeout(() => fetchAddresses(value), 350);
    };

    const handleSelectAddress = (result: NominatimResult) => {
        // Trim the display_name to a human-friendly form
        const parts = result.display_name.split(",").slice(0, 3).join(",").trim();
        setLocationInput(parts);
        setLocation(parts);
        setLat(parseFloat(result.lat));
        setLng(parseFloat(result.lon));
        setAddressSuggestions([]);
        setShowSuggestions(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!lat || !lng) {
            setError("Please select a location from the suggestions.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        const finalCategory = category === "Other" ? (customCategory || "Other") : category;

        try {
            const res = await fetch("/api/reports", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: finalCategory,
                    location,
                    description,
                    lat,
                    lng,
                    is_anonymous: isAnonymous,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to submit report");
            }

            onSuccess();
            onClose();
            // Reset
            setCategory(PRESET_CATEGORIES[0]);
            setCustomCategory("");
            setLocation("");
            setLocationInput("");
            setDescription("");
            setLat(null);
            setLng(null);
            setIsAnonymous(false);
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!mounted || !isOpen) return null;

    const modal = (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Dialog */}
            <div
                className="relative z-10 w-full max-w-lg overflow-y-auto max-h-[90vh] rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-[var(--shadow-xl)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* ── Header ──────────────────────────────────────────── */}
                <div className="flex items-start justify-between border-b border-[var(--color-border-subtle)] px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-subtle)]">
                            <ShieldExclamationIcon className="h-5 w-5 text-[var(--color-text-brand)]" />
                        </div>
                        <div>
                            <h2
                                id="report-modal-title"
                                className="text-sm font-black uppercase tracking-widest text-[var(--color-text-primary)]"
                            >
                                Report an Incident
                            </h2>
                            <p className="mt-1 text-xs text-[var(--color-text-tertiary)]">
                                Help keep Montgomery safe.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* ── Form ────────────────────────────────────────────── */}
                <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
                    {error && (
                        <div className="rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                            {error}
                        </div>
                    )}

                    {/* Incident Type — pill selector */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] px-1">
                            Incident Type
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_CATEGORIES.map((c) => {
                                const selected = category === c;
                                const Icon = CATEGORY_ICONS[c];
                                return (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setCategory(c)}
                                        className={`flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${selected
                                            ? "border-[var(--color-brand-default)] bg-[var(--color-brand-subtle)] text-[var(--color-text-brand)]"
                                            : "border-[var(--color-border-default)] bg-[var(--color-bg-inset)] text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)]"
                                            }`}
                                    >
                                        {selected ? (
                                            <CheckIcon className="h-3 w-3 shrink-0" />
                                        ) : (
                                            Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                                        )}
                                        {c}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Custom category input — revealed when "Other" is selected */}
                        {category === "Other" && (
                            <div className="relative mt-2 group">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                    <PencilSquareIcon className="h-4 w-4 text-[var(--color-text-tertiary)] group-focus-within:text-[var(--color-brand-default)] transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={customCategory}
                                    onChange={(e) => setCustomCategory(e.target.value)}
                                    placeholder="Describe the incident type..."
                                    className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-inset)] py-3 pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:border-[var(--color-brand-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-default)]/20 transition-all cursor-text"
                                />
                            </div>
                        )}
                    </div>

                    {/* Location — address autocomplete */}
                    <div className="space-y-2">
                        <label
                            htmlFor="report-location"
                            className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] px-1"
                        >
                            Location
                        </label>
                        <div className="relative group" ref={locationRef}>
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                <MapPinIcon className="h-4 w-4 text-[var(--color-text-tertiary)] group-focus-within:text-[var(--color-brand-default)] transition-colors" />
                            </div>
                            <input
                                id="report-location"
                                type="text"
                                value={locationInput}
                                onChange={(e) => handleLocationChange(e.target.value)}
                                onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
                                required
                                autoComplete="off"
                                placeholder="Start typing an address..."
                                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-inset)] py-3 pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:border-[var(--color-brand-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-default)]/20 transition-all cursor-text"
                            />

                            {/* Address dropdown */}
                            {showSuggestions && addressSuggestions.length > 0 && (
                                <ul className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] shadow-[var(--shadow-lg)]">
                                    {addressSuggestions.map((r) => {
                                        const short = r.display_name.split(",").slice(0, 3).join(",").trim();
                                        return (
                                            <li key={r.place_id}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleSelectAddress(r)}
                                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"
                                                >
                                                    <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]" />
                                                    {short}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label
                            htmlFor="report-description"
                            className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] px-1"
                        >
                            Details
                        </label>
                        <div className="relative group">
                            <div className="pointer-events-none absolute top-3.5 left-3.5">
                                <ChatBubbleBottomCenterTextIcon className="h-4 w-4 text-[var(--color-text-tertiary)] group-focus-within:text-[var(--color-brand-default)] transition-colors" />
                            </div>
                            <textarea
                                id="report-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                rows={4}
                                placeholder="Describe what you observed..."
                                className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-inset)] py-3 pl-11 pr-4 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)] focus:border-[var(--color-brand-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-default)]/20 transition-all cursor-text"
                            />
                        </div>
                    </div>

                    {/* Anonymous Reporting Option */}
                    <div className="flex items-center gap-3 px-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[var(--color-bg-inset)] peer-focus:outline-none rounded-full peer border border-[var(--color-border-default)] peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-brand-default)]"></div>
                            <span className="ml-3 text-xs font-bold text-[var(--color-text-secondary)]">Report Anonymously</span>
                        </label>
                    </div>

                    {/* ── 911 Notice ──────────────────────────────────────── */}
                    <div className="mx-6 mt-4 flex items-center justify-center gap-3 rounded-[var(--radius-sm)] border border-red-500/20 bg-red-500/10 px-4 py-3 text-center">
                        <ExclamationTriangleIcon className="h-4 w-4 shrink-0 text-red-400" />
                        <p className="text-xs text-red-400">
                            <span className="font-black">Emergency?</span>{" "}
                            Please call{" "}
                            <a href="tel:911" className="font-black underline hover:text-red-300 transition-colors">
                                911
                            </a>{" "}
                            for immediate danger.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border-subtle)] pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-black uppercase tracking-widest text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] disabled:opacity-50 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-brand-default)] px-5 py-2.5 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-[var(--color-brand-hover)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <PaperAirplaneIcon className="h-4 w-4" />
                                    Submit Report
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
}
