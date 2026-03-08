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
        const { category, description, location, lat, lng, is_anonymous } = body;

        if (!category) {
            return NextResponse.json({ error: "Category is required" }, { status: 400 });
        }

        const { error } = await supabaseAuth
            .from("resident_reports")
            .insert({
                category,
                description,
                address: location,
                lat,
                lng,
                is_anonymous: !!is_anonymous,
                created_by: is_anonymous ? null : user.id,
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
