import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/";

    if (code) {
        const supabase = await createClient();
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // Get the user's role and redirect accordingly
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (user) {
                const { data } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", user.id)
                    .single();

                const role = data?.role ?? "resident";
                const redirectPath =
                    role === "official" || role === "dispatcher" ? "/official" : next;

                return NextResponse.redirect(`${origin}${redirectPath}`);
            }
        }
    }

    // If something went wrong, redirect to login with error
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}