import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { IosInstallHint } from "@/components/IosInstallHint";
import { Analytics } from "@vercel/analytics/next";
import { SITE_DESCRIPTION, SITE_TAGLINE, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: `Coffee Club — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "Coffee Club",
    title: `Coffee Club — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image" },
  applicationName: "Coffee Club",
  appleWebApp: {
    capable: true,
    title: "Coffee Club",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [{ url: "/icons/apple-icon-180.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#b45309",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <main className="flex-1">{children}</main>
        <IosInstallHint />
        {/* /_vercel/insights/script.js only exists on Vercel; elsewhere (next start) it 404s on every page. */}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
