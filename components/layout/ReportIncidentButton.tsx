"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { PlusIcon } from "@heroicons/react/24/outline";
import ReportIncidentModal from "@/components/dashboard/ReportIncidentModal";

export default function ReportButton() {
    const [user, setUser] = useState<User | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);

    useEffect(() => {
        const supabase = createClient();

        const fetchUserAndRole = async (authUser: User | null) => {
            setUser(authUser);
            if (authUser) {
                const { data, error } = await supabase
                    .from("users")
                    .select("role")
                    .eq("id", authUser.id)
                    .single();

                if (!error && data) {
                    setUserRole(data.role);
                }
            } else {
                setUserRole(null);
            }
            setIsLoading(false);
        };

        supabase.auth.getUser().then(({ data }) => fetchUserAndRole(data.user));

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => { fetchUserAndRole(session?.user ?? null); }
        );

        return () => subscription.unsubscribe();
    }, []);

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
