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

/**
 * Subscribes to the Supabase auth state and returns the current user and profile.
 *
 * Centralizes the repetitive pattern of calling `auth.getUser()` +
 * `auth.onAuthStateChange` that was previously duplicated across several
 * components. All consumers share the same underlying singleton client,
 * so there is only ever one active subscription per page.
 *
 * Usage:
 *   const { user, role, isLoading } = useUser();
 */
export function useUser(): UseUserResult {
    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase
            .from("users")
            .select("role, display_name, avatar_url")
            .eq("id", userId)
            .single();

        if (data) {
            setRole(data.role ?? "resident");
            setDisplayName(data.display_name);
            setAvatarUrl(data.avatar_url);
        } else {
            setRole(null);
            setDisplayName(null);
            setAvatarUrl(null);
        }
    };

    useEffect(() => {
        // Resolve the initial session
        supabase.auth.getUser().then(async ({ data }) => {
            setUser(data.user);
            if (data.user) {
                await fetchProfile(data.user.id);
            }
            setIsLoading(false);
        });

        // Keep in sync when auth state changes (sign in, sign out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setUser(session?.user ?? null);
                if (session?.user) {
                    await fetchProfile(session.user.id);
                } else {
                    setRole(null);
                    setDisplayName(null);
                    setAvatarUrl(null);
                }
                setIsLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    return { user, role, displayName, avatarUrl, isLoading };
}
