"use client";

import {
    HomeIcon,
    RssIcon,
    ShieldCheckIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    ExclamationCircleIcon,
    ClipboardDocumentCheckIcon,
    UserCircleIcon,
    ChevronUpDownIcon,
    ArrowLeftOnRectangleIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface NavItem {
    name: string;
    href: string;
    icon: React.ForwardRefExoticComponent<any>;
    badge?: string;
}

interface SidebarProps {
    role?: "resident" | "official";
    isOpen?: boolean;
    isLoggedIn?: boolean;
    onClose?: () => void;
}

const RESIDENT_NAV: NavItem[] = [
    { name: "Dashboard", href: "/", icon: HomeIcon },
    { name: "Active Incidents", href: "#", icon: ExclamationCircleIcon, badge: "24" },
    { name: "Intelligence Feed", href: "#", icon: RssIcon },
];

const OFFICIAL_NAV: NavItem[] = [
    { name: "Live Ops", href: "/official", icon: ShieldCheckIcon },
    { name: "Analytics", href: "#", icon: ChartBarIcon },
    { name: "Archive", href: "#", icon: ClipboardDocumentCheckIcon },
];

export default function Sidebar({ role = "resident", isOpen = false, isLoggedIn = false, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const navItems = role === "official" ? OFFICIAL_NAV : RESIDENT_NAV;

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push("/");
        router.refresh();
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[var(--z-drawer)] bg-black/60 backdrop-blur-sm lg:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar Container */}
            <aside className={`
                fixed left-0 top-0 z-[var(--z-drawer)] h-screen w-64
                border-r border-[var(--color-border-default)] bg-[var(--color-bg-sidebar)]
                transition-transform duration-[var(--duration-normal)]
                lg:translate-x-0
                ${isOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                <div className="flex h-full flex-col">
                    {/* Brand Header */}
                    <div className="flex h-16 shrink-0 items-center gap-3 px-6 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-sidebar)]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[#1152d4] shadow-lg shadow-[#1152d4]/40">
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5.5 w-5.5 text-white"
                            >
                                <path
                                    d="M12 2L4 5V11C4 16.19 7.41 21.05 12 22C16.59 21.05 20 16.19 20 11V5L12 2Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M12 22C16.59 21.05 20 16.19 20 11V5L12 2L12 22Z"
                                    fill="white"
                                    fillOpacity="0.2"
                                />
                            </svg>
                        </div>
                        <div className="leading-none">
                            <span className="text-sm font-semibold tracking-tight text-[var(--color-text-primary)]">
                                SafeLens
                            </span>
                            <span className="ml-1 text-sm font-medium tracking-tight text-[var(--color-text-secondary)]">
                                Montgomery
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col p-4 overflow-y-auto">

                        {/* Navigation Section */}
                        <div className="space-y-1">
                            <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4">
                                Navigation
                            </p>
                            {navItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`
                                            group flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors
                                            ${isActive
                                                ? "bg-[var(--color-brand-default)]/10 text-[var(--color-brand-default)]"
                                                : "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)] hover:text-[var(--color-text-primary)] cursor-pointer"}
                                        `}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className="h-5 w-5" />
                                            {item.name}
                                        </div>
                                        {item.badge && (
                                            <span className="rounded-full bg-[var(--color-brand-default)]/20 px-2 py-0.5 text-[10px] font-bold text-[var(--color-brand-default)] border border-[var(--color-brand-default)]/30">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Operations / Admin Section (If Official) */}
                        {role === "official" && (
                            <div className="mt-8 space-y-1">
                                <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] mb-4">
                                    Operations
                                </p>
                                <div className="px-3 space-y-4">
                                    <div className="flex justify-between items-center text-xs text-[var(--color-text-tertiary)]">
                                        <span>Response Time</span>
                                        <span className="font-bold text-[var(--color-text-primary)]">4.2m</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-[var(--color-text-tertiary)]">
                                        <span>Sentinel Level</span>
                                        <span className="font-bold text-[var(--color-success)]">68%</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Footer / User Profile */}
                        <div className="mt-auto border-t border-[var(--color-border-subtle)] pt-4">
                            <button className="group flex w-full items-center gap-3 rounded-[var(--radius-md)] p-2 transition-colors hover:bg-[var(--color-bg-subtle)] cursor-pointer text-left">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-bg-elevated)] text-[var(--color-text-tertiary)] border border-[var(--color-border-default)]">
                                    <UserCircleIcon className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="truncate text-xs font-bold text-[var(--color-text-primary)]">
                                        {role === "official" ? "Officer Miller" : "Alex Resident"}
                                    </p>
                                    <p className="truncate text-[10px] text-[var(--color-text-tertiary)] capitalize">
                                        {role} Account
                                    </p>
                                </div>
                                <ChevronUpDownIcon className="h-4 w-4 text-[var(--color-text-tertiary)] opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>

                            <div className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-bg-canvas)] p-3 border border-[var(--color-border-subtle)]">
                                <p className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-tighter">
                                    Connected Channel
                                </p>
                                <p className="text-xs font-bold text-[var(--color-text-secondary)]">
                                    BROADCAST-ALPHA-01
                                </p>
                            </div>

                            {isLoggedIn && (
                                <button
                                    onClick={handleSignOut}
                                    className="mt-2 group flex w-full items-center gap-3 rounded-[var(--radius-md)] p-2 transition-colors hover:bg-red-500/10 cursor-pointer text-left text-red-500 hover:text-red-400"
                                >
                                    <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                                    <span className="text-sm font-medium">Log Out</span>
                                </button>
                            )}
                        </div>

                    </div>
                </div>
            </aside>
        </>
    );
}
