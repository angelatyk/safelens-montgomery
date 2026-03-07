import { createClient as createServerClient } from "@/lib/supabase/server";

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

// Redirect path after login based on role
export function getRedirectPath(role: string | null): string {
    if (role === "official" || role === "dispatcher") return "/official";
    return "/";
}