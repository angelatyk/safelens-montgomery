"use client";

import { useState, useEffect } from "react";
import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { useUser } from "@/lib/context/UserContext";

interface VerifiedBadgeProps {
    id: string;
    table?: 'resident_reports' | 'narratives';
    initialStatus?: string;
}

export default function VerifiedBadge({ id, table = 'resident_reports', initialStatus = 'submitted' }: VerifiedBadgeProps) {
    const { supabase } = useUser();
    const [status, setStatus] = useState(initialStatus);

    useEffect(() => {
        if (!id) return;

        // Subscribe to changes on the specified table
        const channel = supabase
            .channel(`status-${table}-${id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: table,
                    filter: `id=eq.${id}`
                },
                (payload) => {
                    if (payload.new && payload.new.status) {
                        setStatus(payload.new.status);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [id, table]);

    if (status !== 'verified') return null;

    return (
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-success-bg)]/20 text-[var(--color-success)] border border-[var(--color-success-border)]/50 shadow-sm animate-in fade-in zoom-in duration-500">
            <CheckBadgeIcon className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">
                Verified by City
            </span>
        </div>
    );
}
