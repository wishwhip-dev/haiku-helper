import { appConfig } from "@/app/config";
import { describeConfig } from "@/lib/config/schema";

// The settings this app declares in app/config.ts, as the build check and WishWhip's gallery read
// them: the kinds, labels, limits and defaults, nothing the live app does not already show anyone.
// Built once with the app (the schema changes only with a new version). Do not edit, move or
// remove this file; see docs/config.md.

export const dynamic = "force-static";

export function GET(): Response {
  return Response.json(describeConfig(appConfig), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
