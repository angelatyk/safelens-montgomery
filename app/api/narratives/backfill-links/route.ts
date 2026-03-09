import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * One-time backfill: link existing narratives to their source incidents/news articles
 * via the junction tables (narrative_incidents, narrative_news_articles).
 *
 * Strategy: For each narrative, search for matching source data using content matching
 * since hash-based matching fails due to JSON serialization differences at scale.
 */

export async function POST() {
    try {
        // Fetch all narratives
        const { data: narratives, error: narErr } = await supabaseAdmin
            .from("narratives")
            .select("id, title, content, source_data_hash, resident_report_id, neighborhood_id");

        if (narErr) {
            return NextResponse.json({ error: narErr.message }, { status: 500 });
        }

        // Check existing links to avoid duplicates
        const { data: existingIncidentLinks } = await supabaseAdmin
            .from("narrative_incidents")
            .select("narrative_id");
        const linkedNarrativeIds = new Set(
            (existingIncidentLinks || []).map(l => l.narrative_id)
        );

        const { data: existingArticleLinks } = await supabaseAdmin
            .from("narrative_news_articles")
            .select("narrative_id");
        const articleLinkedIds = new Set(
            (existingArticleLinks || []).map(l => l.narrative_id)
        );

        let incidentLinks = 0;
        let articleLinks = 0;
        const errors: string[] = [];
        const linked: { narrativeTitle: string; source: string; sourceId: string }[] = [];

        for (const narrative of narratives || []) {
            // Skip if already linked or is a resident report (those use direct FK)
            if (narrative.resident_report_id) continue;

            const title = (narrative.title || "").toLowerCase();
            const content = (narrative.content || "").toLowerCase();

            // Try matching to a news article first (most likely source for existing narratives)
            if (!articleLinkedIds.has(narrative.id)) {
                // Search for articles whose headline appears in the narrative title or content
                const { data: matchingArticles } = await supabaseAdmin
                    .from("news_articles")
                    .select("id, headline")
                    .gte("relevance_score", 0.3)
                    .limit(200);

                let bestMatch: { id: string; headline: string } | null = null;
                let bestScore = 0;

                for (const article of matchingArticles || []) {
                    const headline = article.headline.toLowerCase();
                    // Extract key words (3+ chars) from the headline
                    const words = headline.split(/\s+/).filter((w: string) => w.length >= 4);
                    // Count how many headline words appear in the narrative content
                    const matchCount = words.filter((w: string) => content.includes(w) || title.includes(w)).length;
                    const score = words.length > 0 ? matchCount / words.length : 0;

                    if (score > bestScore && score >= 0.5) {
                        bestScore = score;
                        bestMatch = article;
                    }
                }

                if (bestMatch) {
                    const { error } = await supabaseAdmin
                        .from("narrative_news_articles")
                        .insert({ narrative_id: narrative.id, news_article_id: bestMatch.id });
                    if (error) {
                        errors.push(`article link ${narrative.id}: ${error.message}`);
                    } else {
                        articleLinks++;
                        articleLinkedIds.add(narrative.id);
                        linked.push({
                            narrativeTitle: narrative.title || "untitled",
                            source: "news_article",
                            sourceId: bestMatch.id,
                        });
                    }
                }
            }

            // Try matching to an incident (for narratives with a neighborhood_id)
            if (!linkedNarrativeIds.has(narrative.id) && narrative.neighborhood_id) {
                const { data: matchingIncidents } = await supabaseAdmin
                    .from("incidents")
                    .select("id, type, raw_data")
                    .eq("neighborhood_id", narrative.neighborhood_id)
                    .order("created_at", { ascending: false })
                    .limit(10);

                for (const incident of matchingIncidents || []) {
                    const rawData = typeof incident.raw_data === "string"
                        ? JSON.parse(incident.raw_data)
                        : incident.raw_data || {};
                    const headline = ((rawData.headline || "") as string).toLowerCase();

                    if (headline && (content.includes(headline.slice(0, 30).toLowerCase()) || title.includes(incident.type))) {
                        const { error } = await supabaseAdmin
                            .from("narrative_incidents")
                            .insert({ narrative_id: narrative.id, incident_id: incident.id });
                        if (error) {
                            errors.push(`incident link ${narrative.id}: ${error.message}`);
                        } else {
                            incidentLinks++;
                            linkedNarrativeIds.add(narrative.id);
                            linked.push({
                                narrativeTitle: narrative.title || "untitled",
                                source: "incident",
                                sourceId: incident.id,
                            });
                        }
                        break; // one match per narrative
                    }
                }
            }
        }

        return NextResponse.json({
            backfilled: { incidentLinks, articleLinks },
            totalNarratives: (narratives || []).length,
            linked,
            errors: errors.length > 0 ? errors : undefined,
            message: `Linked ${incidentLinks} incidents and ${articleLinks} news articles to existing narratives.`,
        });
    } catch (err: any) {
        console.error("[backfill-links] Error:", err);
        return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
    }
}
