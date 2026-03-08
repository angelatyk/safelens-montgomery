import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const neighborhood = searchParams.get("neighborhood");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const status = searchParams.get("status");

    let query = supabaseAdmin
        .from("narratives")
        .select(`
            id,
            content,
            generated_at,
            model_used,
            status,
            neighborhoods(id, name),
            neighborhood_id,
            resident_report_id,
            official_notes,
            title
        `)
        .order("generated_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (neighborhood) query = query.eq("neighborhood_id", neighborhood);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Enhance data with vote counts
    const narrativesWithVotes = await Promise.all((data || []).map(async (n: any) => {
        const { count, error: countError } = await supabaseAdmin
            .from("narrative_feedback")
            .select("*", { count: "exact", head: true })
            .eq("narrative_id", n.id)
            .eq("vote", "accurate");

        return {
            ...n,
            vote_tally: count || 0
        };
    }));

    return NextResponse.json({ narratives: narrativesWithVotes, offset, limit });
}
