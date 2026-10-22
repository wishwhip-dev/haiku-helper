import type { NextConfig } from "next";

// The supervisor sets WISHWHIP_STATIC=1 for apps that need no server, and publishes `out/` as plain
// files (docs/plans/static-hosting.md §3–4). Unset, the app builds exactly as before.
const isStatic = process.env.WISHWHIP_STATIC === "1";

const nextConfig: NextConfig = isStatic
  ? { output: "export", images: { unoptimized: true } }
  : {};

export default nextConfig;
