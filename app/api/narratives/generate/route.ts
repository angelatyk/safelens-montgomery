import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-4-20250514";
const DEFAULT_LIMIT = 5;

export const maxDuration = 120;

// Average resolution times by incident type (based on Montgomery historical data)
const AVG_RESOLUTION_HOURS: Record<string, string> = {
    shooting: "6-12 hours for area to be cleared, investigations can take days",
    homicide: "12-24 hours for immediate area, investigation ongoing for weeks",
    robbery: "2-4 hours for immediate response, suspect search can last days",
    assault: "1-3 hours for immediate area",
    fire: "2-6 hours depending on severity",
    traffic: "1-3 hours for road to reopen",
    missing_person: "actively monitored until resolved",
    weather: "varies — check local weather updates",
    police: "1-4 hours for area to clear",
    general: "typically a few hours",
};

type NeighborhoodContext = {
    name: string;
    safety_score: number;
};

async function loadNeighborhoodContext(): Promise<{
    neighborhoods: NeighborhoodContext[];
    contextBlock: string;
}> {
    const { data } = await supabaseAdmin
        .from("neighborhoods")
        .select("name, safety_score")
        .order("name");

    const neighborhoods = (data || []) as NeighborhoodContext[];

    const safe = neighborhoods
        .filter((n) => n.safety_score >= 90)
        .map((n) => n.name);
    const caution = neighborhoods
        .filter((n) => n.safety_score >= 70 && n.safety_score < 90)
        .map((n) => `${n.name} (${n.safety_score})`);
    const hotspots = neighborhoods
        .filter((n) => n.safety_score < 70)
        .map((n) => `${n.name} (${n.safety_score})`);

    const contextBlock = `
Montgomery Neighborhood Safety Context (scores 0-100, higher = safer):
- Generally safe areas: ${safe.join(", ") || "N/A"}
- Use caution: ${caution.join(", ") || "N/A"}
- Current hotspots: ${hotspots.join(", ") || "N/A"}

Use this to give location-specific advice. If the incident is near a hotspot, advise extra caution. If it's in a usually-safe area, note that it's unusual for that neighborhood.`.trim();

    return { neighborhoods, contextBlock };
}

function computeHash(data: Record<string, unknown>): string {
    return createHash("sha256")
        .update(JSON.stringify(data))
        .digest("hex")
        .slice(0, 16);
}

function parseResponse(text: string): { title: string; content: string } {
    const titleMatch = text.match(/TITLE:\s*(.+)/i);
    const contentMatch = text.match(/CONTENT:\s*([\s\S]+)/i);

    return {
        title: titleMatch?.[1]?.trim() || text.split("\n")[0].slice(0, 80),
        content: contentMatch?.[1]?.trim() || text.trim(),
    };
}

function buildIncidentPrompt(incident: {
    raw_data: Record<string, unknown>;
    type: string;
    occurred_at: string | null;
    neighborhood_name: string | null;
}, neighborhoodContext: string): string {
    const rd = incident.raw_data || {};
    const resolutionTime = AVG_RESOLUTION_HOURS[incident.type] || AVG_RESOLUTION_HOURS["general"];
    return `You write safety updates for SafeLens Montgomery — a community app that helps residents of Montgomery, Alabama stay informed and look out for each other.

Your readers are everyday people: parents, students, workers, neighbors. Write like a trusted neighbor keeping everyone in the loop — not like a police scanner or news anchor.

Here's what happened:
- What: ${rd.headline || "Unknown"}
- Type: ${incident.type || "general"}
- How serious: ${rd.severity || "unknown"}
- Confirmed by: ${rd.source_count || 1} source(s) (${rd.sources || "local reports"})
- Where: ${incident.neighborhood_name || "Montgomery area"}
- When: ${incident.occurred_at || "Recently"}
- Confidence: ${rd.credibility_score || "N/A"}/100
- Typical resolution time for this type: ${resolutionTime}

${neighborhoodContext}

Rules:
- Simple, everyday language — no police jargon or technical terms
- Be honest but not scary. People should feel informed, not panicked
- If confidence is below 40, say something like "we're still getting details on this"
- Mention the specific neighborhood and whether it's typically safe or a known hotspot
- Give a rough timeline ("these situations usually clear up in a few hours") so people know what to expect
- Tell people near the area what to do (stay inside, take a different route, etc.) and reassure people in other areas
- End with something helpful they can DO (stay aware, avoid the area, check on neighbors, call 911 if they see something)
- Make them feel like their awareness matters — they're part of keeping Montgomery safe
- 3-4 short sentences max

Respond exactly as:
TITLE: [casual but clear, 8 words max]
CONTENT: [3-4 sentences, warm and location-aware]`;
}

function buildNewsPrompt(article: {
    headline: string;
    source: string | null;
    published_at: string | null;
    relevance_score: number;
}, neighborhoodContext: string): string {
    return `You write safety updates for SafeLens Montgomery — a community app that helps residents of Montgomery, Alabama stay informed and look out for each other.

Summarize this news story for everyday people. They want to know: what happened, should I worry, and what can I do?

News story:
- Headline: ${article.headline}
- Source: ${article.source || "News outlet"}
- Published: ${article.published_at || "Recent"}

${neighborhoodContext}

Rules:
- Plain language — explain it like you're telling a friend
- Focus on what matters to someone living in Montgomery
- Don't repeat the headline word for word — rephrase it naturally
- If a specific area is mentioned, reference whether it's typically safe or a known hotspot
- End with a simple tip or reminder (stay safe, be aware, avoid the area, etc.)
- Make them feel like staying informed helps the whole community
- 2-3 short sentences max

Respond exactly as:
TITLE: [casual but clear, 8 words max]
CONTENT: [2-3 sentences, warm and human]`;
}

function buildReportPrompt(report: {
    category: string;
    description: string | null;
    status: string;
    created_at: string;
}, neighborhoodContext: string): string {
    return `You write safety updates for SafeLens Montgomery — a community app where residents of Montgomery, Alabama help keep each other safe.

A neighbor just reported something. Turn their report into a quick, friendly update that lets the community know what's going on and makes the person who reported feel heard.

What they reported:
- Category: ${report.category}
- Their words: ${report.description || "No details provided"}
- Status: ${report.status}
- When: ${report.created_at}

${neighborhoodContext}

Rules:
- Thank or acknowledge the person who reported (e.g. "Thanks to a community member who flagged this...")
- Use plain, friendly language — like you're posting in a neighborhood group chat
- If a location is mentioned, reference whether that area is typically safe or needs extra attention
- Make it clear that reporting things like this helps everyone
- Include a simple action item (keep an eye out, report if you see something similar, etc.)
- 2-3 short sentences max

Respond exactly as:
TITLE: [casual but clear, 8 words max]
CONTENT: [2-3 sentences, warm and appreciative]`;
}

async function generateNarrative(
    anthropic: Anthropic,
    prompt: string
): Promise<{ title: string; content: string }> {
    const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
    });

    const text =
        response.content[0].type === "text" ? response.content[0].text : "";
    return parseResponse(text);
}

export async function POST(request: Request) {
    try {
        // Check for API key
        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json(
                { error: "ANTHROPIC_API_KEY not configured in .env.local" },
                { status: 500 }
            );
        }

        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        const { searchParams } = new URL(request.url);
        const maxItems = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT));

        // Load neighborhood context for location-aware narratives
        const { contextBlock } = await loadNeighborhoodContext();

        // Load existing narrative hashes + report IDs for dedup
        const { data: existingNarratives, error: narError } = await supabaseAdmin
            .from("narratives")
            .select("source_data_hash, resident_report_id");

        if (narError) {
            return NextResponse.json({ error: "Failed to load narratives: " + narError.message }, { status: 500 });
        }

        const existingHashes = new Set(
            (existingNarratives || [])
                .map((n) => n.source_data_hash)
                .filter(Boolean)
        );
        const existingReportIds = new Set(
            (existingNarratives || [])
                .map((n) => n.resident_report_id)
                .filter(Boolean)
        );

        const results: { source: string; title: string; id: string }[] = [];
        const errors: string[] = [];
        let processed = 0;

        // ── Source 1: Incidents ──────────────────────────────────────
        const { data: incidents } = await supabaseAdmin
            .from("incidents")
            .select("id, type, neighborhood_id, occurred_at, raw_data, neighborhoods(name)")
            .order("created_at", { ascending: false })
            .limit(50);

        console.log(`[generate] Found ${incidents?.length ?? 0} incidents, ${existingHashes.size} existing hashes`);

        for (const incident of incidents || []) {
            if (processed >= maxItems) break;

            const rawData = typeof incident.raw_data === "string"
                ? JSON.parse(incident.raw_data)
                : incident.raw_data || {};
            const hash = computeHash(rawData);

            if (existingHashes.has(hash)) continue;

            try {
                console.log(`[generate] Processing incident ${incident.id}...`);
                const prompt = buildIncidentPrompt({
                    raw_data: rawData,
                    type: incident.type,
                    occurred_at: incident.occurred_at,
                    neighborhood_name: (incident as any).neighborhoods?.name || null,
                }, contextBlock);

                const { title, content } = await generateNarrative(anthropic, prompt);

                const { data: inserted, error: insertErr } = await supabaseAdmin
                    .from("narratives")
                    .insert({
                        neighborhood_id: incident.neighborhood_id,
                        content,
                        title,
                        model_used: MODEL,
                        source_data_hash: hash,
                        status: "active",
                    })
                    .select("id")
                    .single();

                if (insertErr) {
                    errors.push(`Insert error for incident ${incident.id}: ${insertErr.message}`);
                } else if (inserted) {
                    existingHashes.add(hash);
                    results.push({ source: "incident", title, id: inserted.id });
                    processed++;
                    console.log(`[generate] Created narrative: ${title}`);
                }
            } catch (err: any) {
                const msg = `Error for incident ${incident.id}: ${err?.message || err}`;
                console.error(`[generate] ${msg}`);
                errors.push(msg);
            }
        }

        // ── Source 2: News Articles (safety-relevant only) ───────────
        const { data: articles } = await supabaseAdmin
            .from("news_articles")
            .select("id, headline, source, published_at, relevance_score")
            .gte("relevance_score", 0.3)
            .order("published_at", { ascending: false })
            .limit(50);

        console.log(`[generate] Found ${articles?.length ?? 0} safety-relevant articles`);

        for (const article of articles || []) {
            if (processed >= maxItems) break;

            const hash = computeHash({ headline: article.headline, source: article.source });
            if (existingHashes.has(hash)) continue;

            try {
                console.log(`[generate] Processing article: ${article.headline.slice(0, 60)}...`);
                const prompt = buildNewsPrompt(article, contextBlock);
                const { title, content } = await generateNarrative(anthropic, prompt);

                const { data: inserted, error: insertErr } = await supabaseAdmin
                    .from("narratives")
                    .insert({
                        content,
                        title,
                        model_used: MODEL,
                        source_data_hash: hash,
                        status: "active",
                    })
                    .select("id")
                    .single();

                if (insertErr) {
                    errors.push(`Insert error for article ${article.id}: ${insertErr.message}`);
                } else if (inserted) {
                    existingHashes.add(hash);
                    results.push({ source: "news", title, id: inserted.id });
                    processed++;
                    console.log(`[generate] Created narrative: ${title}`);
                }
            } catch (err: any) {
                const msg = `Error for article ${article.id}: ${err?.message || err}`;
                console.error(`[generate] ${msg}`);
                errors.push(msg);
            }
        }

        // ── Source 3: Resident Reports ──────────────────────────────
        const { data: reports } = await supabaseAdmin
            .from("resident_reports")
            .select("id, category, description, status, created_at")
            .order("created_at", { ascending: false })
            .limit(50);

        console.log(`[generate] Found ${reports?.length ?? 0} resident reports`);

        for (const report of reports || []) {
            if (processed >= maxItems) break;
            if (existingReportIds.has(report.id)) continue;

            try {
                console.log(`[generate] Processing report ${report.id}...`);
                const prompt = buildReportPrompt(report, contextBlock);
                const { title, content } = await generateNarrative(anthropic, prompt);

                const { data: inserted, error: insertErr } = await supabaseAdmin
                    .from("narratives")
                    .insert({
                        content,
                        title,
                        model_used: MODEL,
                        source_data_hash: computeHash({ report_id: report.id }),
                        status: "active",
                        resident_report_id: report.id,
                    })
                    .select("id")
                    .single();

                if (insertErr) {
                    errors.push(`Insert error for report ${report.id}: ${insertErr.message}`);
                } else if (inserted) {
                    existingReportIds.add(report.id);
                    results.push({ source: "resident_report", title, id: inserted.id });
                    processed++;
                    console.log(`[generate] Created narrative: ${title}`);
                }
            } catch (err: any) {
                const msg = `Error for report ${report.id}: ${err?.message || err}`;
                console.error(`[generate] ${msg}`);
                errors.push(msg);
            }
        }

        return NextResponse.json({
            generated: results.length,
            narratives: results,
            errors: errors.length > 0 ? errors : undefined,
            message: results.length > 0
                ? `Generated ${results.length} narratives from incidents, news, and reports.`
                : "No new items to process. All data already has narratives.",
        });
    } catch (err: any) {
        console.error("[generate] Fatal error:", err);
        return NextResponse.json(
            { error: err?.message || "Internal server error" },
            { status: 500 }
        );
    }
}
