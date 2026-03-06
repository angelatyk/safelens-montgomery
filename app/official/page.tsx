import TopBar from "@/components/layout/TopBar";

export default function OfficialOpsPage() {
    return (
        <div className="flex min-h-screen flex-col bg-[var(--color-bg-canvas)]">
            <TopBar />
            <main className="flex flex-1 flex-col items-center justify-center pt-16 px-4 text-center">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                    Official Operations Panel
                </h1>
                <p className="mt-4 text-[var(--color-text-secondary)]">
                    [RESTRICTED ACCESS: This view is for city officials and law enforcement only.]
                </p>
                <div className="mt-8 flex gap-4">
                    <a
                        href="/"
                        className="rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] transition-colors"
                    >
                        ← Back to Public Dashboard
                    </a>
                </div>
            </main>
        </div>
    );
}
