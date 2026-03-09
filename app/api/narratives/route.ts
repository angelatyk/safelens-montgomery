import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const neighborhood = searchParams.get("neighborhood");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    const status = searchParams.get("status");
    const statusGroup = searchParams.get("status_group"); // 'active' or 'resolved'
    const sinceHours = searchParams.get("since_hours");

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
        .order("generated_at", { ascending: false });

    if (neighborhood) query = query.eq("neighborhood_id", neighborhood);

    if (statusGroup === 'active') {
        query = query.in("status", ['active', 'verified']);
    } else if (statusGroup === 'resolved') {
        query = query.eq("status", "resolved");
    } else if (status) {
        query = query.eq("status", status);
    }

    if (sinceHours) {
        const date = new Date(Date.now() - parseInt(sinceHours) * 60 * 60 * 1000).toISOString();
        query = query.gte("generated_at", date);
    }

    query = query.range(offset, offset + limit - 1);

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
            { data: publicUpdate },
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
            supabaseAdmin
                .from("narrative_public_updates")
                .select("content")
                .eq("narrative_id", n.id)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
        ]);

        return {
            ...n,
            vote_tally: voteCount || 0,
            incident_count: incidentCount ?? n.incident_count ?? 0,
            news_count: newsCount ?? n.news_count ?? 0,
            latest_public_update: publicUpdate?.content ?? null,
        };
    }));

    return NextResponse.json({ narratives: narrativesWithVotes, offset, limit });
}
