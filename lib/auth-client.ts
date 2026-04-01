import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
// Removed unused import

/**
 * Client-side auth helpers — safe to import in Client Components.
 *
 * IMPORTANT: Do NOT import anything from @/lib/auth here.
 * lib/auth imports lib/supabase/server which uses next/headers — a
 * server-only API that will break client component builds.
 */

/** Returns the dashboard path for a given role. */
function getRedirectPath(role: string | null): string {
    if (role === "official" || role === "dispatcher") return "/official";
    return "/";
}

/**
 * Fetches the authenticated user's role and redirects to the correct dashboard.
 * Call this after a successful sign-in in any Client Component.
 */
export async function redirectAfterLogin(router: AppRouterInstance, supabase: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

    router.push(getRedirectPath(data?.role ?? null));
}
