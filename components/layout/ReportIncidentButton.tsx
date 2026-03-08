"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/lib/hooks/useUser";
import { supabase } from "@/lib/supabase/client";
import { PlusIcon } from "@heroicons/react/24/outline";
import ReportIncidentModal from "@/components/dashboard/ReportIncidentModal";

export default function ReportButton() {
    const { user, isLoading } = useUser();
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    // Fetch the user's role whenever their auth state changes
    useEffect(() => {
        if (!user) {
            setUserRole(null);
            return;
        }

        supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single()
            .then(({ data, error }) => {
                if (!error && data) setUserRole(data.role);
            });
    }, [user]);

    if (isLoading || !user || userRole !== "resident") return null;

    return (
        <>
            <button
                onClick={() => setIsReportModalOpen(true)}
                className="flex items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-brand-default)] px-3.5 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-[var(--color-brand-hover)] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                aria-label="Report Incident"
            >
                <PlusIcon className="h-3.5 w-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Report Incident</span>
                <span className="sm:hidden">Report</span>
            </button>

            <ReportIncidentModal
                isOpen={isReportModalOpen}
                onClose={() => setIsReportModalOpen(false)}
                onSuccess={() => {
                    window.dispatchEvent(new CustomEvent("incidentReported"));
                }}
            />
        </>
    );
}
