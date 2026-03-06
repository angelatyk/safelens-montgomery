import TopBar from "@/components/layout/TopBar";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col bg-[var(--color-bg-canvas)]">
            <TopBar />
            <main className="flex flex-1 flex-col items-center justify-center pt-16 px-4 text-center">
                <div className="w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-xl">
                    <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text-primary)] text-center mb-6">
                        Sign in to SafeLens
                    </h1>
                    <p className="text-sm text-[var(--color-text-secondary)] mb-8 text-center px-4">
                        Authorized access for Residents and city Officials of Montgomery, Alabama.
                    </p>
                    <div className="flex flex-col gap-4">
                        <button className="w-full rounded-[var(--radius-md)] bg-[var(--color-brand-default)] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-brand-hover)] transition-colors">
                            Continue with Authentication
                        </button>
                        <a
                            href="/"
                            className="mt-2 text-xs font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-text-brand)] transition-colors"
                        >
                            ← Back to Public Dashboard
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}
