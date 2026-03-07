"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopBar from "@/components/layout/TopBar";
import AuthButton from "@/components/auth/AuthButton";
import { createClient } from "@/lib/supabase/client";
import {
    EnvelopeIcon,
    LockClosedIcon,
    EyeIcon,
    EyeSlashIcon,
    ArrowLeftIcon,
} from "@heroicons/react/24/outline";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Email/password sign in
    const handleEmailSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading("email");

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(null);
            return;
        }

        // Get role and redirect
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase
                .from("users")
                .select("role")
                .eq("id", user.id)
                .single();
            const role = data?.role ?? "resident";
            router.push(role === "official" || role === "dispatcher" ? "/official" : "/");
        }
    };

    // OAuth sign in (Google, GitHub)
    const handleOAuth = async (provider: "google" | "github") => {
        setError(null);
        setLoading(provider);

        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setError(error.message);
            setLoading(null);
        }
        // No need to handle success — OAuth redirects the page automatically
    };

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

                    <div className="space-y-8 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] p-8 shadow-2xl shadow-black/40 backdrop-blur-md">

                        {/* Error message */}
                        {error && (
                            <div className="rounded-[var(--radius-sm)] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                                {error}
                            </div>
                        )}

                        {/* Email/Password Form */}
                        <form className="space-y-5" onSubmit={handleEmailSignIn}>
                            <div className="space-y-2">
                                <label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)] px-1">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                                        <EnvelopeIcon className="h-4 w-4 text-[var(--color-text-tertiary)] group-focus-within:text-[var(--color-brand-default)] transition-colors" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        placeholder="name@montgomery.gov"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-inset)] pl-11 pr-4 py-3 text-sm text-white placeholder:text-[var(--color-text-disabled)] focus:border-[var(--color-brand-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-default)]/20 transition-all cursor-text"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-[var(--color-text-tertiary)]">
                                        Password
                                    </label>
                                    <button type="button" className="text-[10px] font-bold text-[var(--color-text-brand)] hover:text-blue-300 transition-colors uppercase tracking-widest cursor-pointer">
                                        Forgot?
                                    </button>
                                </div>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                                        <LockClosedIcon className="h-4 w-4 text-[var(--color-text-tertiary)] group-focus-within:text-[var(--color-brand-default)] transition-colors" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-inset)] pl-11 pr-11 py-3 text-sm text-white placeholder:text-[var(--color-text-disabled)] focus:border-[var(--color-brand-default)] focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-default)]/20 transition-all font-mono cursor-text"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-[var(--color-text-tertiary)] hover:text-white transition-colors cursor-pointer"
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="h-4 w-4" />
                                        ) : (
                                            <EyeIcon className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={!!loading}
                                className="w-full rounded-[var(--radius-sm)] bg-[var(--color-brand-default)] py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--color-brand-default)]/20 hover:bg-[var(--color-brand-hover)] active:scale-[0.99] transition-all disabled:opacity-50 mt-2 cursor-pointer"
                            >
                                {loading === "email" ? "Signing In..." : "Sign In"}
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="relative py-3">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                <div className="w-full border-t border-[var(--color-border-subtle)]"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                                <span className="bg-[var(--color-bg-surface)] px-4 text-[var(--color-text-tertiary)]">
                                    Or continue with
                                </span>
                            </div>
                        </div>

                        {/* OAuth Buttons */}
                        <div className="flex items-center justify-center gap-8">
                            <AuthButton
                                provider="google"
                                iconOnly
                                onClick={() => handleOAuth("google")}
                                loading={loading === "google"}
                            />
                            <AuthButton
                                provider="github"
                                iconOnly
                                onClick={() => handleOAuth("github")}
                                loading={loading === "github"}
                            />
                        </div>
                    </div>

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