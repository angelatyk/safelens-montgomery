import { createBrowserClient } from "@supabase/ssr";

/**
 * A module-level singleton browser Supabase client.
 *
 * Use this everywhere in Client Components and browser-side code.
 * Never call `createBrowserClient` directly in component bodies or
 * effects — import this singleton instead so all components share the
 * same session and auth state.
 *
 * NOTE: The server-side client (`lib/supabase/server.ts`) must still
 * be created per-request because it reads cookies dynamically.
 */
export const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);