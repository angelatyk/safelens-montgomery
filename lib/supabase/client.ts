import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a new Supabase browser client.
 * 
 * IMPORTANT: Because of inner locking mechanisms in @supabase/ssr, 
 * this should ONLY be called once inside the root UserProvider (via useState),
 * and then passed down via React Context. Do not call this directly in components.
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}