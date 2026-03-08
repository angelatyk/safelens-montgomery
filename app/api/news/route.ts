import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

// Sources that should not appear in the public safety news feed
const EXCLUDED_SOURCES = ["twitter", "x.com", "facebook"];

// Keywords that indicate non-safety content (history, opinion, listicles)
const NOISE_KEYWORDS = [
    "history", "picture of the day", "best restaurant", "top 10",
    "years ago", "on this day", "throwback", "recipe", "review",
];

function isRelevantSafety(headline: string, source: string | null): boolean {
    const lower = headline.toLowerCase();
    const src = (source || "").toLowerCase();

    // Exclude social media sources
    if (EXCLUDED_SOURCES.some((ex) => src.includes(ex))) return false;

    // Exclude noise content
    if (NOISE_KEYWORDS.some((kw) => lower.includes(kw))) return false;

    return true;
}

function cleanHeadline(headline: string): { title: string; summary: string | null } {
    // Our scraper stores "Title | Summary" format — split them
    if (headline.includes(" | ")) {
        const [title, ...rest] = headline.split(" | ");
        return { title: title.trim(), summary: rest.join(" | ").trim() || null };
    }
    return { title: headline.trim(), summary: null };
}

export async function GET() {
    // Filter to public safety content only (relevance >= 0.3 = multiple safety keyword matches)
    const { data, error } = await supabaseAdmin
        .from("news_articles")
        .select("*")
        .gte("relevance_score", 0.3)
        .order("published_at", { ascending: false })
        .limit(30); // fetch more, then filter down

    if (error) {
        console.error("Error fetching news articles:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Apply additional filters and clean headlines
    const articles = (data ?? [])
        .filter((a) => isRelevantSafety(a.headline, a.source))
        .slice(0, 10)
        .map((a) => {
            const { title, summary } = cleanHeadline(a.headline);
            return {
                ...a,
                headline: title,
                ai_summary: summary,
            };
        });

    return NextResponse.json({ articles });
}
