import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: narrativeId } = await params;
    const { officialStatus, verifiedBy } = await request.json();

    const updateData: any = {
        official_status: officialStatus,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString()
    };

    // If official marks as 'verified' or 'resolved', we also update the public status
    if (officialStatus === 'verified' || officialStatus === 'dispatched') {
        updateData.status = 'verified';
    } else if (officialStatus === 'resolved') {
        updateData.status = 'resolved';
    }

    // 1. Update the narrative
    const { data: narrative, error: updateError } = await supabaseAdmin
        .from("narratives")
        .update(updateData)
        .eq("id", narrativeId)
        .select(`
            resident_report_id,
            official_notes,
            verified_by,
            verified_at,
            status,
            official_status,
            official_update
        `)
        .single();

    if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 2. If resident_report_id is set, update the linked resident report
    if (narrative.resident_report_id) {
        const { error: reportError } = await supabaseAdmin
            .from("resident_reports")
            .update({
                verified_by: narrative.verified_by,
                verified_at: narrative.verified_at,
                official_response: narrative.official_notes,
                status: 'verified' // Sync status as well
            })
            .eq("id", narrative.resident_report_id);

        if (reportError) {
            console.error("Failed to update linked resident report:", reportError);
            // We don't necessarily want to fail the whole request if the report update fails,
            // but we should probably log it.
        }
    }

    return NextResponse.json({ success: true, narrative });
}
