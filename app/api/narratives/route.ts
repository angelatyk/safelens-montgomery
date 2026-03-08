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
            title,
            official_status,
            official_update,
            incident_count,
            news_count
        `)
        .order("generated_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (neighborhood) query = query.eq("neighborhood_id", neighborhood);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute real counts from junction tables, fall back to static columns for legacy data
    const narrativesWithVotes = await Promise.all((data || []).map(async (n: any) => {
        const [
            { count: voteCount },
            { count: incidentCount },
            { count: newsCount },
        ] = await Promise.all([
            supabaseAdmin
                .from("narrative_feedback")
                .select("*", { count: "exact", head: true })
                .eq("narrative_id", n.id)
                .eq("vote", "accurate"),
            supabaseAdmin
                .from("narrative_incidents")
                .select("*", { count: "exact", head: true })
                .eq("narrative_id", n.id),
            supabaseAdmin
                .from("narrative_news_articles")
                .select("*", { count: "exact", head: true })
                .eq("narrative_id", n.id),
        ]);

        return {
            ...n,
            vote_tally: voteCount || 0,
            incident_count: incidentCount ?? n.incident_count ?? 0,
            news_count: newsCount ?? n.news_count ?? 0,
        };
    }));

    return NextResponse.json({ narratives: narrativesWithVotes, offset, limit });
}
