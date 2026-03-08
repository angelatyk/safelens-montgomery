import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
    // We filter by relevance_score > 0 as a proxy for public safety relevance
    const { data, error } = await supabaseAdmin
        .from("news_articles")
        .select("*")
        .gt("relevance_score", 0)
        .order("published_at", { ascending: false })
        .limit(10);

    if (error) {
        console.error("Error fetching news articles:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ articles: data ?? [] });
}
