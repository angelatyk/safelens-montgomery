import { SparklesIcon, ChartBarIcon, ShieldExclamationIcon } from "@heroicons/react/24/outline";

export default function AISafetyInsights() {
    return (
        <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-ai-border)] bg-[var(--color-ai-bg)] p-6 shadow-xl shadow-purple-500/5">
            {/* Decorative gradient overlay */}
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-purple-500/10 blur-3xl" />

            <div className="relative flex flex-col gap-6">
                <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400">
                        <SparklesIcon className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">AI Safety Insights</h2>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-purple-400/80">
                            Proactive Pattern Recognition
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Insight Item 1 */}
                    <div className="flex gap-3">
                        <ChartBarIcon className="h-5 w-5 shrink-0 text-purple-400" />
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-purple-100">Emerging Pattern Detected</p>
                            <p className="text-xs leading-relaxed text-[var(--color-navy-200)]">
                                3% increase in non-emergency safety reports within the Cloverdale area over the last 48 hours. Similarity to previous utility maintenance patterns is high.
                            </p>
                        </div>
                    </div>

                    {/* Insight Item 2 */}
                    <div className="flex gap-3">
                        <ShieldExclamationIcon className="h-5 w-5 shrink-0 text-indigo-400" />
                        <div className="space-y-1">
                            <p className="text-xs font-semibold text-indigo-100">Community Safety Advice</p>
                            <p className="text-xs leading-relaxed text-[var(--color-navy-200)]">
                                Based on historical data for early March, consider coordinating neighborhood walks before dusk in the East Montgomery park zones.
                            </p>
                        </div>
                    </div>
                </div>

                <button className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-purple-600/20 py-2.5 text-xs font-bold text-purple-100 border border-purple-500/30 transition-all hover:bg-purple-600/40">
                    View Detailed Analytics
                </button>
            </div>
        </div>
    );
}
