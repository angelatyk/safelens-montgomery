import { createClient } from "@supabase/supabase-js";

/**
 * A module-level singleton Supabase admin client using the service role key.
 *
 * This client BYPASSES Row Level Security (RLS) and should ONLY be used in
 * trusted server-side contexts (API routes, background workers, etc.).
 *
 * NEVER expose this client or the service role key to the browser.
 */
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
