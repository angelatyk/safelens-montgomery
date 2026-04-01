import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { UserProvider } from "@/lib/context/UserContext";
import "./globals.css";

/* ---------------------------------------------------------------------------
   Fonts
   Inter: primary UI font (matches Stitch design)
   Geist Mono: data values, IDs, incident codes, map coordinates
--------------------------------------------------------------------------- */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  // Preload only the weights we use in the design system
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/* ---------------------------------------------------------------------------
   Metadata
   SEO-ready defaults for the application. Route-level layouts and pages
   can override specific fields via Next.js metadata inheritance.
--------------------------------------------------------------------------- */
export const metadata: Metadata = {
  title: {
    default: "SafeLens Montgomery",
    template: "%s | SafeLens Montgomery",
  },
  description:
    "Community safety intelligence platform for the City of Montgomery, Alabama. Real-time incident mapping, AI-assisted triage, and two-way resident communication.",
  keywords: [
    "Montgomery",
    "Alabama",
    "community safety",
    "crime map",
    "incident reporting",
    "public safety",
    "AI",
  ],
  authors: [{ name: "SafeLens Team" }],
  creator: "SafeLens Montgomery",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "SafeLens Montgomery",
    title: "SafeLens Montgomery",
    description:
      "Community safety intelligence platform for the City of Montgomery, Alabama.",
  },
  robots: {
    index: process.env.NODE_ENV === "production",
    follow: process.env.NODE_ENV === "production",
  },
};

/* ---------------------------------------------------------------------------
   Viewport — prevents small-device zoom on input focus, sets theme color
   to match our dark canvas (#09090b)
--------------------------------------------------------------------------- */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

/* ---------------------------------------------------------------------------
   Root Layout
--------------------------------------------------------------------------- */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
