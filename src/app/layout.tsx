import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Serif } from "next/font/google";
import "./globals.css";

// One variable family for display and body (the `wdth` axis gives the
// condensed display cut), plus a single italic serif for editorial accents.
const archivo = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-accent",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
});

const siteName = "The Gents Games & Entertainment";
const siteDescription =
  "Games and recreation in Kileleshwa, Nairobi. Explore the activities at The Gents Games & Entertainment and plan your visit.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  openGraph: {
    type: "website",
    siteName,
    locale: "en_KE",
    title: siteName,
    description: siteDescription,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#161513",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} ${instrumentSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
