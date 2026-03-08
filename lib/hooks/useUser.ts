"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface UseUserResult {
    /** The currently authenticated user, or null if not signed in. */
    user: User | null;
    /** True while the initial auth state is being resolved. */
    isLoading: boolean;
}

/**
 * Subscribes to the Supabase auth state and returns the current user.
 *
 * Centralizes the repetitive pattern of calling `auth.getUser()` +
 * `auth.onAuthStateChange` that was previously duplicated across several
 * components. All consumers share the same underlying singleton client,
 * so there is only ever one active subscription per page.
 *
 * Usage:
 *   const { user, isLoading } = useUser();
 */
export function useUser(): UseUserResult {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Resolve the initial session
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
            setIsLoading(false);
        });

        // Keep in sync when auth state changes (sign in, sign out, token refresh)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setUser(session?.user ?? null);
                // Once we get any auth state change, we know loading is done
                setIsLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    return { user, isLoading };
}
