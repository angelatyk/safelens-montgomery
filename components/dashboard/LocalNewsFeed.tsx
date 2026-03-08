"use client";

import { NewspaperIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";

interface NewsArticle {
    id: string;
    headline: string;
    source: string | null;
    url: string | null;
    published_at: string | null;
    relevance_score: number;
}

function formatRelativeTime(dateString: string | null) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
}

export default function LocalNewsFeed() {
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchNews() {
            try {
                const response = await fetch("/api/news");
                const data = await response.json();
                if (data.articles) {
                    setArticles(data.articles);
                }
            } catch (error) {
                console.error("Failed to fetch news articles:", error);
            } finally {
                setIsLoading(false);
            }
        }

        fetchNews();
    }, []);

    return (
        <aside className="flex flex-col gap-6 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/50 p-6 backdrop-blur-sm h-fit">
            <div className="flex items-center gap-3 border-b border-[var(--color-border-subtle)] pb-4">
                <div className="flex bg-[var(--color-brand-default)]/10 p-2 rounded-lg">
                    <NewspaperIcon className="h-5 w-5 text-[var(--color-brand-default)]" />
                </div>
                <div className="flex flex-col">
                    <h2 className="text-lg font-bold text-[var(--color-text-primary)] leading-none">
                        Public Safety News Feed
                    </h2>
                    <span className="text-[10px] text-[var(--color-text-tertiary)] mt-1 font-medium uppercase tracking-wider">
                        Real-time Montgomery updates
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                {isLoading ? (
                    <div className="flex flex-col gap-4 animate-pulse">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col gap-2">
                                <div className="h-2 w-24 bg-[var(--color-border-default)] rounded"></div>
                                <div className="h-4 w-full bg-[var(--color-border-default)] rounded"></div>
                                <div className="h-3 w-32 bg-[var(--color-border-default)] rounded"></div>
                            </div>
                        ))}
                    </div>
                ) : articles.length > 0 ? (
                    articles.map((article) => (
                        <article key={article.id} className="group flex flex-col gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-tertiary)] group-hover:text-[var(--color-brand-default)] transition-colors">
                                {article.source || "Unknown Source"} • {formatRelativeTime(article.published_at)}
                            </span>
                            <h3 className="text-sm font-medium leading-snug text-[var(--color-text-primary)] group-hover:text-[var(--color-brand-default)] transition-colors line-clamp-2">
                                {article.headline}
                            </h3>
                            {article.url && (
                                <a
                                    href={article.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-brand-default)] hover:text-[var(--color-brand-hover)]"
                                >
                                    Read full context
                                    <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                </a>
                            )}
                        </article>
                    ))
                ) : (
                    <p className="text-sm text-[var(--color-text-tertiary)] italic">No recent safety updates.</p>
                )}
            </div>

            <div className="mt-2 rounded-[var(--radius-sm)] border border-[var(--color-ai-border)] bg-[var(--color-ai-bg)] p-3">
                <p className="text-[11px] leading-relaxed text-[var(--color-navy-200)]">
                    <span className="font-bold text-[var(--color-ai)]">AI Insight:</span> Bright Data scraping identifies a correlation between recent news trends and emerging safety reports in the Cloverdale area.
                </p>
            </div>
        </aside>
    );
}
