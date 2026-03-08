import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const neighborhood = searchParams.get("neighborhood");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabaseAdmin
        .from("narratives")
        .select(`
            id,
            content,
            generated_at,
            model_used,
            neighborhoods(id, name),
            neighborhood_id
        `)
        .order("generated_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (neighborhood) query = query.eq("neighborhood_id", neighborhood);

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ narratives: data, offset, limit });
}
