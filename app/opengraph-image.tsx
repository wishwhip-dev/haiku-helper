import { ImageResponse } from "next/og";
import { badgeHidden, IconArt, MUTED_TEXT, PAGE, TEXT } from "./icon-art";
import { identity } from "./identity";

// The picture a link to this app shows when it is pasted into a chat or a post: the icon, the name
// and the description in the page's own colours, and the address at the foot so a stranger can see
// where the link goes. Drawn from app/identity.ts. ImageResponse lays out with flexbox only — no
// grid — and uses its own built-in font.
export const alt = identity.name;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Static export (WISHWHIP_STATIC=1) needs this to prerender the file; harmless on a server build.
export const dynamic = "force-static";

// A long name steps down a size so the name and a full description always fit the card.
const nameLength = Array.from(identity.name).length;
const nameSize = nameLength > 36 ? 56 : nameLength > 22 ? 64 : 76;

// Set by the host at build time: the address the app is reached at. Absent elsewhere.
const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
// The same condition as the footer (components/attribution.tsx): shown only where WishWhip hosts
// the app and the owner's plan keeps the line.
const madeWith = /^https?:\/\//.test(process.env.NEXT_PUBLIC_WISHWHIP_URL ?? "") && !badgeHidden;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: PAGE, color: TEXT, padding: "72px 96px 56px" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
          <div style={{ width: 112, height: 112, display: "flex" }}>
            <IconArt size={112} rounded />
          </div>
          <div style={{ display: "flex", fontSize: nameSize, lineHeight: 1.1, letterSpacing: -1 }}>{identity.name}</div>
          <div style={{ display: "flex", fontSize: 32, lineHeight: 1.35, color: MUTED_TEXT }}>{identity.description}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 24, color: MUTED_TEXT }}>
          <div style={{ display: "flex" }}>{host ?? ""}</div>
          {madeWith ? <div style={{ display: "flex", fontSize: 20 }}>Made with WishWhip</div> : null}
        </div>
      </div>
    ),
    size,
  );
}
