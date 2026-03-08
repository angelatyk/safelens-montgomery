import { BellIcon, MagnifyingGlassIcon, Bars3Icon } from "@heroicons/react/24/outline";
import ReportIncidentButton from "./ReportIncidentButton";

interface TopBarProps {
    onMenuClick?: () => void;
    variant?: "default" | "minimal";
    hideSidebar?: boolean;
}

export default function TopBar({ onMenuClick, variant = "default", hideSidebar = false }: TopBarProps) {
    const isMinimal = variant === "minimal";

    return (
        <header
            className={`fixed inset-x-0 top-0 z-[var(--z-sticky)] h-16 border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/80 backdrop-blur-md transition-all duration-[var(--duration-normal)] ${hideSidebar ? "lg:pl-0" : "lg:pl-64"
                }`}
        >
            <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

                {/* ── Brand & Menu ──────────────────────────────────── */}
                <div className="flex shrink-0 items-center gap-4">
                    {/* Mobile Menu Toggle (Hidden if hideSidebar is true) */}
                    {!hideSidebar && (
                        <button
                            type="button"
                            onClick={onMenuClick}
                            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] lg:hidden"
                            aria-label="Open menu"
                        >
                            <Bars3Icon className="h-6 w-6" />
                        </button>
                    )}

                    {/* Shield logo mark */}
                    <div className={`flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] bg-[#1152d4] shadow-lg shadow-[#1152d4]/40 ${!hideSidebar ? 'lg:hidden' : ''}`}>
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5.5 w-5.5 text-white"
                        >
                            <path
                                d="M12 2L4 5V11C4 16.19 7.41 21.05 12 22C16.59 21.05 20 16.19 20 11V5L12 2Z"
                                fill="currentColor"
                            />
                            <path
                                d="M12 22C16.59 21.05 20 16.19 20 11V5L12 2L12 22Z"
                                fill="white"
                                fillOpacity="0.2"
                            />
                        </svg>
                    </div>

                    {/* Wordmark */}
                    <div className={`leading-none ${!hideSidebar ? 'lg:hidden' : ''}`}>
                        <span className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
                            SafeLens
                        </span>
                        <span className="ml-1 text-sm font-medium tracking-tight text-[var(--color-text-secondary)]">
                            Montgomery
                        </span>
                    </div>
                </div>

                {/* ── Search (Hidden in minimal mode) ───────────────── */}
                {!isMinimal && (
                    <div className="hidden w-full max-w-md sm:block">
                        <label htmlFor="global-search" className="sr-only">
                            Search incidents, neighborhoods
                        </label>
                        <div className="relative">
                            <MagnifyingGlassIcon
                                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]"
                                aria-hidden="true"
                            />
                            <input
                                id="global-search"
                                type="search"
                                placeholder="Search incidents, neighborhoods…"
                                className="
                  w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)]
                  bg-[var(--color-bg-inset)] py-2 pl-9 pr-4
                  text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)]
                  transition-[border-color,box-shadow] duration-[var(--duration-normal)]
                  focus:border-[var(--color-border-brand)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-default)]/30
                "
                                autoComplete="off"
                            />
                        </div>
                    </div>
                )}

                {/* ── Actions ───────────────────────────────────────── */}
                <div className="flex shrink-0 items-center gap-4">
                    {/* Only show actions if NOT minimal */}
                    {!isMinimal && (
                        <>
                            {/* Report Incident Button */}
                            <ReportIncidentButton />

                            {/* Notification bell */}
                            <button
                                type="button"
                                aria-label="View notifications"
                                className="
                  relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-[var(--radius-md)]
                  text-[var(--color-text-secondary)]
                  transition-colors duration-[var(--duration-normal)]
                  hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]
                  focus-visible:outline-2 focus-visible:outline-[var(--color-brand-default)]
                "
                            >
                                <BellIcon className="h-5 w-5" aria-hidden="true" />
                                <span
                                    aria-label="3 unread notifications"
                                    className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-critical)] ring-2 ring-[var(--color-bg-surface)]"
                                />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
