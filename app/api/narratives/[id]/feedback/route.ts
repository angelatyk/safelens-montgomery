import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: narrativeId } = await params;
    const { vote, userId } = await request.json();

    if (!['accurate', 'not_relevant'].includes(vote)) {
        return NextResponse.json({ error: "Invalid vote" }, { status: 400 });
    }

    const headerList = await headers();
    const ip = headerList.get("x-forwarded-for") || "unknown";

    // 1. Rate Limiting Check (15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // Check for recent feedback from same User OR IP (IP check if needed/stored)
    let existingQuery = supabaseAdmin
        .from("narrative_feedback")
        .select("id")
        .eq("narrative_id", narrativeId)
        .gt("created_at", fifteenMinsAgo);

    if (userId) {
        existingQuery = existingQuery.eq("user_id", userId);
    }
    // Note: IP check would require storing IP in narrative_feedback. 
    // For now, we rely on user_id if logged in, and localStorage on frontend for anonymous.
    // L2 IP rate limiting can be added if we add an 'ip' column.

    const { data: existing, error: checkError } = await existingQuery;

    if (checkError) {
        return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (existing && existing.length > 0) {
        return NextResponse.json({ error: "Too many requests. Please wait 15 minutes." }, { status: 429 });
    }

    // 2. Insert Feedback
    const { error: insertError } = await supabaseAdmin
        .from("narrative_feedback")
        .insert({
            narrative_id: narrativeId,
            user_id: userId || null,
            vote: vote
        });

    if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // 3. Auto-Resolution Logic (Option C)
    // Count votes for this narrative
    const { data: votes, error: countError } = await supabaseAdmin
        .from("narrative_feedback")
        .select("vote")
        .eq("narrative_id", narrativeId);

    if (!countError && votes) {
        const totalVotes = votes.length;
        const notRelevantVotes = votes.filter(v => v.vote === 'not_relevant').length;

        // Condition: >= 5 "not_relevant" AND >= 60% of total
        if (notRelevantVotes >= 5 && (notRelevantVotes / totalVotes) >= 0.6) {
            // Resolve Narrative
            const { data: narrative, error: resolveError } = await supabaseAdmin
                .from("narratives")
                .update({ status: 'resolved' })
                .eq("id", narrativeId)
                .select("resident_report_id")
                .single();

            if (!resolveError && narrative?.resident_report_id) {
                // Update linked resident report
                await supabaseAdmin
                    .from("resident_reports")
                    .update({
                        status: 'resolved',
                        verified_at: new Date().toISOString()
                    })
                    .eq("id", narrative.resident_report_id);
            }
        }
    }

    // 4. Update Source Reputation (Attribute to 'SafeLens AI')
    const { data: rep } = await supabaseAdmin
        .from("source_reputation")
        .select("total_votes, accurate_votes, not_relevant_votes")
        .eq("source_name", "SafeLens AI")
        .single();

    if (rep) {
        const isAccurate = vote === 'accurate';
        const newTotal = (rep.total_votes || 0) + 1;
        const newAccurate = (rep.accurate_votes || 0) + (isAccurate ? 1 : 0);
        const newNotRelevant = (rep.not_relevant_votes || 0) + (isAccurate ? 0 : 1);
        const newScore = Math.round((newAccurate / newTotal) * 100);

        await supabaseAdmin
            .from("source_reputation")
            .update({
                total_votes: newTotal,
                accurate_votes: newAccurate,
                not_relevant_votes: newNotRelevant,
                accuracy_score: newScore,
                updated_at: new Date().toISOString()
            })
            .eq("source_name", "SafeLens AI");
    }

    return NextResponse.json({ success: true });
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: narrativeId } = await params;
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: votes, error } = await supabaseAdmin
        .from("narrative_feedback")
        .select("vote, created_at")
        .eq("narrative_id", narrativeId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = votes.length;
    const accurate = votes.filter(v => v.vote === 'accurate').length;
    const notRelevant = votes.filter(v => v.vote === 'not_relevant').length;

    const recentVotes = votes.filter(v => v.created_at >= fifteenMinsAgo);
    const recentAccurate = recentVotes.filter(v => v.vote === 'accurate').length;
    const recentNotRelevant = recentVotes.filter(v => v.vote === 'not_relevant').length;

    return NextResponse.json({
        stats: {
            total,
            accurate,
            notRelevant,
            recent: {
                total: recentVotes.length,
                accurate: recentAccurate,
                notRelevant: recentNotRelevant
            }
        }
    });
}
