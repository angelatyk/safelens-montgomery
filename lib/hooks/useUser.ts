"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface UseUserResult {
    /** The currently authenticated user, or null if not signed in. */
    user: User | null;
    /** The user's role from the database ('resident', 'official', 'admin'). */
    role: string | null;
    /** The user's display name, if set. */
    displayName: string | null;
    /** The user's avatar URL, if set. */
    avatarUrl: string | null;
    /** True while the initial auth state and profile are being resolved. */
    isLoading: boolean;
}

export function useUser(): UseUserResult {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async (sessionUser: User) => {
        // Immediately set name/avatar from session metadata (always available)
        const meta = sessionUser.user_metadata;
        setDisplayName(meta?.full_name ?? meta?.name ?? meta?.display_name ?? null);
        setAvatarUrl(meta?.avatar_url ?? meta?.picture ?? null);
        setRole("resident"); // default while DB loads

        // Then try DB for role + any overrides
        const { data, error } = await supabase
            .from("users")
            .select("role, display_name, avatar_url")
            .eq("id", sessionUser.id)
            .single();

        if (error) {
            console.error("fetchProfile DB error:", error);
        }

        if (data) {
            setRole(data.role ?? "resident");
            if (data.display_name) setDisplayName(data.display_name);
            if (data.avatar_url) setAvatarUrl(data.avatar_url);
        }
    };

    useEffect(() => {
        let mounted = true;

        async function getInitialSession() {
            const { data } = await supabase.auth.getSession();
            if (!mounted) return;

            setUser(data.session?.user ?? null);
            if (data.session?.user) {
                await fetchProfile(data.session.user);
            }
            if (mounted) setIsLoading(false);
        }

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mounted) return;

                // Avoid double fetch if Supabase fires INITIAL_SESSION concurrently
                if (_event === 'INITIAL_SESSION') return;

                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user);
                } else {
                    setRole(null);
                    setDisplayName(null);
                    setAvatarUrl(null);
                }
                if (mounted) setIsLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return { user, role, displayName, avatarUrl, isLoading };
}