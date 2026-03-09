import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: narrativeId } = await params;
    const { searchParams } = new URL(request.url);
    const isOfficial = searchParams.get("official") === "true";

    let query = supabaseAdmin
        .from("narrative_comments")
        .select(`
            id,
            content,
            created_at,
            is_official,
            user_id,
            users!narrative_comments_user_id_fkey(display_name)
        `)
        .eq("narrative_id", narrativeId)
        .order("created_at", { ascending: false });

    // If not requesting official view, filter to public comments only
    if (!isOfficial) {
        query = query.eq("is_official", false);
    }

    const { data: rows, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the nested users join into a top-level display_name field
    const comments = (rows || []).map((c: Record<string, unknown>) => ({
        ...c,
        display_name: (c.users as { display_name?: string } | null)?.display_name ?? null,
        users: undefined,
    }));

    return NextResponse.json({ comments });
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: narrativeId } = await params;
    const { content, userId, isOfficial } = await request.json();

    if (!content) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { data: comment, error } = await supabaseAdmin
        .from("narrative_comments")
        .insert({
            narrative_id: narrativeId,
            user_id: userId || null,
            content,
            is_official: isOfficial || false
        })
        .select(`
            id,
            content,
            created_at,
            is_official,
            user_id,
            users!narrative_comments_user_id_fkey(display_name)
        `)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ comment });
}
