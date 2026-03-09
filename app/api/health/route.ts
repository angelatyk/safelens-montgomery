import { supabaseAdmin } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const { error } = await supabaseAdmin.from("narratives").select("id").limit(1);

        if (error) {
            console.error("Health check database error:", error);
            return NextResponse.json({ status: "error", message: "Database connection failed" }, { status: 500 });
        }

        return NextResponse.json({ status: "ok" });
    } catch (err) {
        console.error("Health check unexpected error:", err);
        return NextResponse.json({ status: "error", message: "Internal server error" }, { status: 500 });
    }
}
