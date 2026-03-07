import AlertBox from "@/components/dashboard/AlertBox";
import IncidentFeed from "@/components/dashboard/IncidentFeed";
import LocalNewsFeed from "@/components/dashboard/LocalNewsFeed";
import AISafetyInsights from "@/components/dashboard/AISafetyInsights";

export default function HomePage() {
    return (
        <div className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8">
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
        </div>
    );
}
