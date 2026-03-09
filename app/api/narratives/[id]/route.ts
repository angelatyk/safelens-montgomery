import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: narrativeId } = await params;

    const { data: narrative, error } = await supabaseAdmin
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
        .eq("id", narrativeId)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!narrative) {
        return NextResponse.json({ error: "Narrative not found" }, { status: 404 });
    }

    // Compute real counts from junction tables, same as the list endpoint
    const [
        { count: voteCount },
        { count: incidentCount },
        { count: newsCount },
        { data: publicUpdate },
    ] = await Promise.all([
        supabaseAdmin
            .from("narrative_feedback")
            .select("*", { count: "exact", head: true })
            .eq("narrative_id", narrative.id)
            .eq("vote", "accurate"),
        supabaseAdmin
            .from("narrative_incidents")
            .select("*", { count: "exact", head: true })
            .eq("narrative_id", narrative.id),
        supabaseAdmin
            .from("narrative_news_articles")
            .select("*", { count: "exact", head: true })
            .eq("narrative_id", narrative.id),
        supabaseAdmin
            .from("narrative_public_updates")
            .select("content")
            .eq("narrative_id", narrative.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    return NextResponse.json({
        ...narrative,
        vote_tally: voteCount || 0,
        incident_count: incidentCount ?? narrative.incident_count ?? 0,
        news_count: newsCount ?? narrative.news_count ?? 0,
        latest_public_update: publicUpdate?.content ?? null,
    });
}
