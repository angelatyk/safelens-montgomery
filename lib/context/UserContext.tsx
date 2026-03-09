"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface UserContextValue {
    user: User | null;
    role: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    isLoading: boolean;
}

const UserContext = createContext<UserContextValue>({
    user: null,
    role: null,
    displayName: null,
    avatarUrl: null,
    isLoading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
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
                const { data } = await supabase.auth.getSession();
                if (!mounted) return;
                setUser(data.session?.user ?? null);
                if (data.session?.user) await fetchProfile(data.session.user);
            } catch (e) {
                console.warn('Session fetch aborted', e);
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        getInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                if (!mounted) return;
                if (_event === "INITIAL_SESSION") return; // already handled above
                setUser(session?.user ?? null);
                if (session?.user) {
                    try {
                        await fetchProfile(session.user);
                    } catch (e) {
                        console.warn('fetchProfile aborted', e);
                    }
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

    return (
        <UserContext.Provider value={{ user, role, displayName, avatarUrl, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}

export function useUser() {
    return useContext(UserContext);
}
