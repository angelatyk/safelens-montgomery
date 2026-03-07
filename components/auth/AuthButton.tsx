import React from "react";

interface AuthButtonProps {
    provider: "google" | "github" | "email";
    onClick?: () => void;
    loading?: boolean;
    iconOnly?: boolean;
}

const PROVIDER_CONFIG = {
    google: {
        name: "Google",
        bg: "bg-white",
        text: "text-zinc-900 border border-zinc-200",
        icon: (
            <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                />
                <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                />
                <path
                    d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    fill="#FBBC05"
                />
                <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                />
            </svg>
        ),
    },
    github: {
        name: "GitHub",
        bg: "bg-[#24292e]",
        text: "text-white",
        icon: (
            <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
        ),
    },
    email: {
        name: "Email",
        bg: "bg-zinc-800",
        text: "text-white",
        icon: (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
        ),
    },
};

export default function AuthButton({ provider, onClick, loading, iconOnly }: AuthButtonProps) {
    const config = PROVIDER_CONFIG[provider];

    if (iconOnly) {
        return (
            <button
                onClick={onClick}
                disabled={loading}
                title={`Continue with ${config.name}`}
                className={`
          flex h-11 w-11 items-center justify-center rounded-full transition-all 
          hover:opacity-90 active:scale-[0.98] disabled:opacity-50
          ${config.bg} ${config.text}
        `}
            >
                {loading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                    config.icon
                )}
            </button>
        );
    }

    return (
        <button
            onClick={onClick}
            disabled={loading}
            className={`
        flex w-full items-center justify-center gap-3 rounded-[var(--radius-sm)] px-4 py-2.5 
        text-sm font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50
        ${config.bg} ${config.text}
      `}
        >
            {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
                config.icon
            )}
            Continue with {config.name}
        </button>
    );
}