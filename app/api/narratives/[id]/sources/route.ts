import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * GET /api/narratives/[id]/sources
 * Returns the actual linked incidents, news articles, and resident report
 * that back a given narrative — so officers can review the raw source data.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Fetch linked incidents via junction table
    const { data: incidentLinks } = await supabaseAdmin
        .from("narrative_incidents")
        .select(`
            incident_id,
            incidents (
                id,
                type,
                source,
                occurred_at,
                lat,
                lng,
                raw_data,
                neighborhoods ( name )
            )
        `)
        .eq("narrative_id", id);

    // Fetch linked news articles via junction table
    const { data: articleLinks } = await supabaseAdmin
        .from("narrative_news_articles")
        .select(`
            news_article_id,
            news_articles (
                id,
                headline,
                source,
                url,
                published_at,
                relevance_score
            )
        `)
        .eq("narrative_id", id);

    // Fetch linked resident report (direct FK on narratives table)
    const { data: narrative } = await supabaseAdmin
        .from("narratives")
        .select("resident_report_id")
        .eq("id", id)
        .single();

    let residentReport = null;
    if (narrative?.resident_report_id) {
        const { data } = await supabaseAdmin
            .from("resident_reports")
            .select("id, category, description, status, created_at")
            .eq("id", narrative.resident_report_id)
            .single();
        residentReport = data;
    }

    const incidents = (incidentLinks || []).map((link: any) => {
        const inc = link.incidents;
        if (!inc) return null;
        const raw = typeof inc.raw_data === "string" ? JSON.parse(inc.raw_data) : inc.raw_data || {};
        return {
            id: inc.id,
            type: inc.type,
            source: inc.source,
            headline: raw.headline || null,
            severity: raw.severity || null,
            credibility_score: raw.credibility_score || null,
            occurred_at: inc.occurred_at,
            neighborhood: inc.neighborhoods?.name || null,
            lat: inc.lat,
            lng: inc.lng,
        };
    }).filter(Boolean);

    const articles = (articleLinks || []).map((link: any) => {
        const art = link.news_articles;
        if (!art) return null;
        return {
            id: art.id,
            headline: art.headline,
            source: art.source,
            url: art.url,
            published_at: art.published_at,
            relevance_score: art.relevance_score,
        };
    }).filter(Boolean);

    return NextResponse.json({
        incidents,
        articles,
        residentReport,
    });
}
