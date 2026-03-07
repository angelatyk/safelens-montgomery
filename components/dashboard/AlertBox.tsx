import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export default function AlertBox() {
    return (
        <div className="rounded-[var(--radius-md)] border border-[var(--color-critical-border)] bg-[var(--color-critical-bg)] p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-[var(--color-critical)]" aria-hidden="true" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-semibold text-[var(--color-critical)]">
                        High Priority: Emergency Broadcast
                    </h3>
                    <div className="mt-1 text-sm text-[var(--color-navy-200)]">
                        <p>
                            [Component Shell: This area will display critical city-wide alerts and high-priority safety notices.]
                        </p>
                    </div>
                    <div className="mt-3">
                        <button
                            type="button"
                            className="cursor-pointer rounded-[var(--radius-sm)] bg-[var(--color-critical)] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                        >
                            View Details
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
