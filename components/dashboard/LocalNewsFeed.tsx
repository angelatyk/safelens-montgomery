import { NewspaperIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

export default function LocalNewsFeed() {
    return (
        <aside className="flex flex-col gap-6 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/50 p-6 backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-4">
                <NewspaperIcon className="h-5 w-5 text-[var(--color-brand-default)]" />
                <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
                    Community Intelligence
                </h2>
            </div>

            <div className="flex flex-col gap-5">
                {[1, 2, 3].map((i) => (
                    <article key={i} className="group flex flex-col gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] group-hover:text-[var(--color-brand-default)] transition-colors">
                            Montgomery Advertiser • 2h ago
                        </span>
                        <h3 className="text-sm font-medium leading-snug text-[var(--color-text-primary)]">
                            Local council debates new safety initiatives for high-traffic downtown corridors.
                        </h3>
                        <a
                            href="#"
                            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand-default)] hover:text-[var(--color-brand-hover)]"
                        >
                            Read full context
                            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                        </a>
                    </article>
                ))}
            </div>

            <div className="mt-4 rounded-[var(--radius-sm)] border border-[var(--color-ai-border)] bg-[var(--color-ai-bg)] p-3">
                <p className="text-[11px] leading-relaxed text-[var(--color-navy-200)]">
                    <span className="font-bold text-[var(--color-ai)]">AI Insight:</span> Bright Data scraping identifies a correlation between recent news trends and emerging safety reports in the Cloverdale area.
                </p>
            </div>
        </aside>
    );
}
