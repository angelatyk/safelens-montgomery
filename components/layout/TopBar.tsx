import { BellIcon, MagnifyingGlassIcon, UserCircleIcon } from "@heroicons/react/24/outline";

export default function TopBar() {
    return (
        <header className="fixed inset-x-0 top-0 z-[var(--z-sticky)] h-16 border-b border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/80 backdrop-blur-md">
            <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

                {/* ── Brand ─────────────────────────────────────────── */}
                <div className="flex shrink-0 items-center gap-2.5">
                    {/* Shield icon mark */}
                    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-default)]">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-4.5 w-4.5 text-white"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>

                    {/* Wordmark */}
                    <div className="leading-none">
                        <span className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
                            SafeLens
                        </span>
                        <span className="ml-1 text-sm font-medium tracking-tight text-[var(--color-text-secondary)]">
                            Montgomery
                        </span>
                    </div>
                </div>

                {/* ── Search ────────────────────────────────────────── */}
                <div className="w-full max-w-md">
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

                {/* ── Actions ───────────────────────────────────────── */}
                <div className="flex shrink-0 items-center gap-1">

                    {/* Notification bell */}
                    <button
                        type="button"
                        aria-label="View notifications"
                        className="
              relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]
              text-[var(--color-text-secondary)]
              transition-colors duration-[var(--duration-normal)]
              hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]
              focus-visible:outline-2 focus-visible:outline-[var(--color-brand-default)]
            "
                    >
                        <BellIcon className="h-5 w-5" aria-hidden="true" />
                        {/* Unread badge */}
                        <span
                            aria-label="3 unread notifications"
                            className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-critical)] ring-2 ring-[var(--color-bg-surface)]"
                        />
                    </button>

                    {/* Divider */}
                    <div className="mx-1 h-5 w-px bg-[var(--color-border-default)]" aria-hidden="true" />

                    {/* Profile */}
                    <button
                        type="button"
                        aria-label="Open user menu"
                        className="
              flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]
              text-[var(--color-text-secondary)]
              transition-colors duration-[var(--duration-normal)]
              hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)]
              focus-visible:outline-2 focus-visible:outline-[var(--color-brand-default)]
            "
                    >
                        <UserCircleIcon className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>
            </div>
        </header>
    );
}
