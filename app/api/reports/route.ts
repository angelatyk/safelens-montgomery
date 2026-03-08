import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        // Authenticate the user
        const supabaseAuth = await createServerClient();
        const { data: { user } } = await supabaseAuth.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Parse the body
        const body = await request.json();
        const { category, description } = body;

        if (!category) {
            return NextResponse.json({ error: "Category is required" }, { status: 400 });
        }

        // Connect to Supabase with service role for admin insert, or just use user client
        // Using service role to ensure insert succeeds regardless of RLS, 
        // OR we can use the authenticated client if RLS is set up properly for insertions.
        // Let's use the authenticated client first so RLS is respected and user_id is automatically associated.
        // The resident_reports table might expect lat/lng which we can omit for now.

        const { error } = await supabaseAuth
            .from("resident_reports")
            .insert({
                category,
                description,
                status: "submitted"
            });

        if (error) {
            console.error("Error inserting report:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch (err: any) {
        console.error("Unexpected error handling report:", err);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
