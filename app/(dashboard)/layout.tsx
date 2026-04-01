"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { useUser } from "@/lib/context/UserContext";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const { user, displayName, avatarUrl } = useUser();

    // Determine role based on path
    const role = pathname?.startsWith("/official") ? "official" : "resident";

    return (
        <div className="min-h-screen bg-[var(--color-bg-canvas)]">
            {/* Universal TopBar */}
            <TopBar onMenuClick={() => setIsSidebarOpen(true)} />

            {/* Sidebar System */}
            <Sidebar
                role={role}
                isOpen={isSidebarOpen}
                isLoggedIn={!!user}
                displayName={displayName}
                avatarUrl={avatarUrl}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main Content Area - Shifted for Sidebar on Desktop */}
            <div className={`
                transition-all duration-[var(--duration-normal)] lg:pl-64
                ${role === 'official' ? 'fixed top-16 bottom-8 inset-x-0 lg:left-0' : ''}
            `}>
                <main className={`
                    ${role === 'official'
                        ? 'h-full'
                        : 'min-h-[calc(100dvh-64px)] pt-16 pb-12'}
                `}>
                    {children}
                </main>
            </div>

            {/* Global Status Footer */}
            <footer className="fixed bottom-0 left-0 right-0 z-[var(--z-navbar)] h-8 flex items-center border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/80 backdrop-blur-md lg:pl-64">
                <div className="mx-auto w-full max-w-screen-2xl px-4 text-center sm:px-6 lg:px-8">
                    <p className="text-[9px] text-[var(--color-text-tertiary)] uppercase tracking-[0.2em] font-medium">
                        Project SafeLens • Build 0.1.0 Alpha • Montgomery, AL
                    </p>
                </div>
            </footer>
        </div>
    );
}
