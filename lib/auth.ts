import { createClient as createServerClient } from "@/lib/supabase/server";

export interface UserProfile {
    id: string;
    email: string;
    role: string;
    display_name: string | null;
    avatar_url: string | null;
}

// Server-side: get current user role (use in Server Components / API routes)
export async function getServerUserRole(): Promise<string | null> {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    return data?.role ?? "resident";
}

// Server-side: get full user profile including display name and avatar
export async function getServerUserProfile(): Promise<UserProfile | null> {
    const supabase = await createServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from("users")
        .select("id, email, role, display_name, avatar_url")
        .eq("id", user.id)
        .single();

    if (!data) return null;

    return {
        id: data.id,
        email: data.email,
        role: data.role ?? "resident",
        display_name: data.display_name ?? null,
        avatar_url: data.avatar_url ?? null,
    };
}

// Redirect path after login based on role
export function getRedirectPath(role: string | null): string {
    if (role === "official" || role === "dispatcher") return "/official";
    return "/";
}