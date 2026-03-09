"use client";

import TopBar from "@/components/layout/TopBar";
import AuthForm from "@/components/auth/AuthForm";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col bg-[var(--color-bg-canvas)]">
            <TopBar variant="minimal" hideSidebar={true} />

            <main className="flex flex-1 flex-col items-center justify-center pt-24 pb-12 px-4 text-center sm:text-left">
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* Header */}
                    <div className="mb-10 px-2 text-center sm:text-left">
                        <h1 className="text-4xl font-bold tracking-tight text-white mb-3">
                            Sign In
                        </h1>
                        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed font-medium">
                            Secure portal for City of Montgomery officials and residents.
                        </p>
                    </div>

                    <AuthForm />

                    {/* Footer links */}
                    <div className="mt-10 text-center space-y-4">
                        <a
                            href="/"
                            className="inline-flex items-center gap-2 text-xs font-bold text-[var(--color-text-tertiary)] hover:text-white transition-all uppercase tracking-[0.2em] active:scale-95 cursor-pointer"
                        >
                            <ArrowLeftIcon className="h-3 w-3" strokeWidth={3} />
                            Back to Dashboard
                        </a>
                    </div>
                </div>
            </main>
        </div>
    );
}