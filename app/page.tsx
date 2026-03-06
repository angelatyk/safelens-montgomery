import TopBar from "@/components/layout/TopBar";
import AlertBox from "@/components/dashboard/AlertBox";
import IncidentFeed from "@/components/dashboard/IncidentFeed";
import LocalNewsFeed from "@/components/dashboard/LocalNewsFeed";
import AISafetyInsights from "@/components/dashboard/AISafetyInsights";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-canvas)]">
      {/* Navigation */}
      <TopBar />

      {/* Main Content Area */}
      <main className="mx-auto max-w-screen-2xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">

          {/* Main Feed Column (Alerts + Incidents) */}
          <div className="flex flex-col gap-8 lg:col-span-8">
            <AlertBox />
            <IncidentFeed />
          </div>

          {/* Sidebar Column (Intelligence & Insights) */}
          <div className="flex flex-col gap-8 lg:col-span-4">
            <div className="sticky top-24 space-y-8">
              <AISafetyInsights />
              <LocalNewsFeed />
            </div>
          </div>

        </div>
      </main>

      {/* Footer / Status Bar - optional placeholder */}
      <footer className="border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/30 py-6">
        <div className="mx-auto max-w-screen-2xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-widest font-bold">
            Project SafeLens • Build 0.1.0 Alpha • Montgomery, AL
          </p>
        </div>
      </footer>
    </div>
  );
}
