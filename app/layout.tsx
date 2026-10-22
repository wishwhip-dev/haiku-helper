import type { Metadata, Viewport } from "next";
import { Attribution } from "@/components/attribution";
import "./globals.css";
import { barColour } from "./icon-art";
import { homeScreenName, identity } from "./identity";
import { Providers } from "./providers";

// The deployed address, so link previews get an absolute URL for the share image. Vercel sets it
// at build time; elsewhere Next falls back to localhost, which is fine for local work.
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

// The name, description and colour come from app/identity.ts. Change them there, not here.
export const metadata: Metadata = {
  metadataBase: productionHost ? new URL(`https://${productionHost}`) : undefined,
  title: { default: identity.name, template: `%s · ${identity.name}` },
  description: identity.description,
  applicationName: identity.name,
  openGraph: { title: identity.name, description: identity.description, siteName: identity.name, type: "website" },
  twitter: { card: "summary_large_image" },
  // Opened from a phone's home screen: full screen, labelled `homeScreenName`, with a light status
  // bar to match the page (never "black-translucent", which draws the page under the bar). Next 16
  // writes only mobile-web-app-capable, so older iPhones get the apple- tag through `other`.
  appleWebApp: { capable: true, title: homeScreenName, statusBarStyle: "default" },
  formatDetection: { telephone: false },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: barColour,
  width: "device-width",
  initialScale: 1,
  // The page reaches the screen's edges; app/globals.css keeps content clear of the notch.
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><Providers>{children}<Attribution /></Providers></body>
    </html>
  );
}
