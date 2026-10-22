import { color, defineConfig, looksLikeContact, text } from "@/lib/config/schema";
import { identity } from "./identity";

/**
 * What a person can change to make this app theirs, with no new build. Anyone can open the live
 * app with their own values in its link and from then on use it as their own copy, with its own
 * data in their browser. docs/config.md has the kinds, the limits and worked examples.
 *
 * - Declare only what changes how the app looks or starts, never what it does: the title, up to
 *   three headings or labels, the color, a starting list (`list`, at most 20 short entries, used by
 *   the seed), a few on/off options (`toggle`) or choices (`choice`). At most 12 settings.
 * - Never a web address, an email address, a phone number, anything private, or anything that
 *   changes what is saved or sent. Defaults are sample content, never anyone's real details.
 * - Labels are plain US English, as a person reads them on a form ("Color", "Starting chores").
 * - Read every value with `useAppConfig(appConfig)` in a client component, and the starting list
 *   with `currentConfig(appConfig)` in the seed in lib/db.ts. Never in a server component, and
 *   never type a value declared here into the page a second time.
 * - Once the app is live, add keys; never rename or remove one.
 *
 * Edit this file. `defineConfig` throws on anything over a limit, so a bad setting fails
 * `npm run build` rather than somebody's first open.
 */

// The app's name, unless it reads like a web address or a number ("Notes.app"), which no setting may
// hold: then a plain default, so the build never fails on the name alone.
const startingTitle = looksLikeContact(identity.name) ? "My list" : identity.name;

export const appConfig = defineConfig({
  title: text({ label: "Title", default: startingTitle, max: 60, role: "title" }),
  heading: text({ label: "Page heading", default: "Write a haiku", max: 60 }),
  topicLabel: text({ label: "Topic input label", default: "Topic", max: 40 }),
  // `role: "accent"` paints `--primary` (buttons, links, focus rings) for a copy that picks another
  // color. A copy that keeps this default looks exactly as the app was built.
  accent: color({ label: "Color", default: identity.accent.toLowerCase(), role: "accent" }),
  // The tone is part of every request to the model, sent as the words below.
  tone: choice({
    label: "Haiku tone",
    options: ["Classic", "Playful", "Melancholy"],
    default: "Classic",
  }),
});
