import TopBar from "@/components/layout/TopBar";

export default function HomePage() {
  return (
    <>
      <TopBar />
      {/* Content area — offset by top bar height (h-16 = 4rem) */}
      <main className="min-h-screen bg-[var(--color-bg-canvas)] pt-16" />
    </>
  );
}
