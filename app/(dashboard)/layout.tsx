"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import { supabase } from "@/lib/supabase/client";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const pathname = usePathname();


    useEffect(() => {
        const fetchProfile = async (userId: string) => {
            const { data } = await supabase
                .from("users")
                .select("display_name, avatar_url")
                .eq("id", userId)
                .single();
            if (data) {
                setDisplayName(data.display_name);
                setAvatarUrl(data.avatar_url);
            }
        };

        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
            if (data.user) {
                fetchProfile(data.user.id);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setDisplayName(null);
                setAvatarUrl(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

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
            <div className="transition-all duration-[var(--duration-normal)] lg:pl-64">
                <main className="min-h-[calc(100vh-64px)] pt-16">
                    {children}
                </main>
            </div>

            {/* Global Status Footer */}
            <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/30 py-4 lg:pl-64">
                <div className="mx-auto max-w-screen-2xl px-4 text-center sm:px-6 lg:px-8">
                    <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-widest font-bold">
                        Project SafeLens • Build 0.1.0 Alpha • Montgomery, AL
                    </p>
                </div>
            </footer>
        </div>
    );
}
