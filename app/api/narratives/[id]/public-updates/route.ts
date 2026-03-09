import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: narrativeId } = await params;

    const { data: rows, error } = await supabaseAdmin
        .from("narrative_public_updates")
        .select(`
            id,
            content,
            created_at,
            user_id,
            users!narrative_public_updates_user_id_fkey(display_name)
        `)
        .eq("narrative_id", narrativeId)
        .order("created_at", { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Flatten the nested users join into a top-level display_name field
    const updates = (rows || []).map((u: Record<string, unknown>) => ({
        ...u,
        display_name: (u.users as { display_name?: string } | null)?.display_name ?? null,
        users: undefined,
    }));

    return NextResponse.json({ updates });
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: narrativeId } = await params;
    const { content, userId } = await request.json();

    if (!content) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { data: update, error } = await supabaseAdmin
        .from("narrative_public_updates")
        .insert({
            narrative_id: narrativeId,
            user_id: userId || null,
            content
        })
        .select(`
            id,
            content,
            created_at,
            user_id,
            users!narrative_public_updates_user_id_fkey(display_name)
        `)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ update });
}
