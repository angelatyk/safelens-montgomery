import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const neighborhood = searchParams.get("neighborhood");
    const type = searchParams.get("type");
    const limit = parseInt(searchParams.get("limit") ?? "10");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabase
        .from("incidents")
        .select("id, type, neighborhood_id, lat, lng, occurred_at, source, raw_data, narratives(content)")
        .order("occurred_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (neighborhood) query = query.eq("neighborhood_id", neighborhood);
    if (type) query = query.eq("type", type);

    const { data, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const incidents = (data ?? []).map((incident) => ({
        ...incident,
        raw_data: typeof incident.raw_data === "string"
            ? JSON.parse(incident.raw_data)
            : incident.raw_data,
    }));

    return NextResponse.json({ incidents, offset, limit });
}