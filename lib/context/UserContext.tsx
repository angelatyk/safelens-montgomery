"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from "react";
import { User, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface UserContextValue {
    supabase: SupabaseClient;
    user: User | null;
    role: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    isLoading: boolean;
}

const UserContext = createContext<UserContextValue>({
    supabase: null as any, // initial value before mount
    user: null,
    role: null,
    displayName: null,
    avatarUrl: null,
    isLoading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
    // Instantiate exactly once per provider lifecycle
    const supabase = useMemo(() => createClient(), []);

    const [user, setUser] = useState<User | null>(null);
    const [role, setRole] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchProfile = async (sessionUser: User) => {
        // Immediately set from session metadata (always available, no network needed)
        const meta = sessionUser.user_metadata;
        setDisplayName(meta?.full_name ?? meta?.name ?? meta?.display_name ?? null);
        setAvatarUrl(meta?.avatar_url ?? meta?.picture ?? null);
        setRole("resident"); // default while DB loads

        // Then override with DB values for role + any custom display name
        const { data, error } = await supabase
            .from("users")
            .select("role, display_name, avatar_url")
            .eq("id", sessionUser.id)
            .single();

        if (error) console.error("fetchProfile DB error:", error);

        if (data) {
            setRole(data.role ?? "resident");
            if (data.display_name) setDisplayName(data.display_name);
            if (data.avatar_url) setAvatarUrl(data.avatar_url);
        }
    };

    useEffect(() => {
        let mounted = true;

        async function getInitialSession() {
            try {
                console.log("[UserContext] getInitialSession starting...");
                const { data } = await supabase.auth.getSession();
                console.log("[UserContext] getInitialSession fetched:", data.session ? "Active Session Found" : "No Session");
                if (!mounted) return;
                setUser(data.session?.user ?? null);
                if (data.session?.user) {
                    console.log("[UserContext] getInitialSession routing to fetchProfile...");
                    setRole("resident"); // default to resident immediately to unblock UI
                    const meta = data.session.user.user_metadata;
                    setDisplayName(meta?.full_name ?? meta?.name ?? meta?.display_name ?? null);
                    setAvatarUrl(meta?.avatar_url ?? meta?.picture ?? null);
                    await fetchProfile(data.session.user);
                }
            } catch (e) {
                console.warn('[UserContext] Session fetch aborted', e);
            } finally {
                console.log("[UserContext] getInitialSession setting isLoading to false.");
                if (mounted) setIsLoading(false);
            }
        }

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event: string, session: any) => {
                console.log(`[UserContext] onAuthStateChange fired with event: ${_event}`);
                if (!mounted) return;
                if (_event === "INITIAL_SESSION") {
                    console.log("[UserContext] onAuthStateChange skipping INITIAL_SESSION");
                    return; // already handled above
                }
                console.log("[UserContext] onAuthStateChange setting user:", session?.user ? "User Found" : "No User");
                setUser(session?.user ?? null);
                if (session?.user) {
                    try {
                        console.log("[UserContext] onAuthStateChange routing to fetchProfile...");
                        setRole("resident"); // default to resident immediately to unblock UI
                        const meta = session.user.user_metadata;
                        setDisplayName(meta?.full_name ?? meta?.name ?? meta?.display_name ?? null);
                        setAvatarUrl(meta?.avatar_url ?? meta?.picture ?? null);
                        await fetchProfile(session.user);
                    } catch (e) {
                        console.warn('[UserContext] fetchProfile aborted', e);
                    }
                } else {
                    console.log("[UserContext] onAuthStateChange clearing profile.");
                    setRole(null);
                    setDisplayName(null);
                    setAvatarUrl(null);
                }
                console.log("[UserContext] onAuthStateChange setting isLoading to false.");
                if (mounted) setIsLoading(false);
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    return (
        <UserContext.Provider value={{ supabase, user, role, displayName, avatarUrl, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
