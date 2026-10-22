<!--
  GENERATED FILE — do not edit here.

  The source of this document lives in the supervisor repository at
  `packages/app-config/docs/config.md`, and it is copied into every application built from a
  template with per-person settings. An edit made here only changes this application's copy.
-->

# Per-person settings

`app/config.ts` lists what a person can change to make this app theirs without changing what it
does: its title, a few labels, its color, its starting list, a few options. Anyone can open the
live app with their own values in the link (`#c=…`), and from then on it is **their own copy**:
their settings, their own database, their own data, in their browser. Nothing is built and nothing
is sent to a server; the part of a link after `#` never leaves the browser.

The settings package is vendored in `lib/config/`. Do not edit it, or `components/copy-boot.tsx`
or `app/app-settings.json/`; edit `app/config.ts`.

## What to make a setting

What a person would change to make the app theirs without changing what it does, and that the
page shows: the title, up to three headings or labels, the color, the starting list of items (at
most 20 short entries), and a few on/off options or choices. Not every string on the page: a
setting is a promise that a copy can change it, and the build check tests every one. When the
plan names the settings, declare exactly those.

## Declaring settings

```ts
// app/config.ts
import { defineConfig, text, list, color, toggle, choice, number } from "@/lib/config/schema";

export const appConfig = defineConfig({
  title: text({ label: "Title", default: "Chore chart", max: 40, role: "title" }),
  people: list({ label: "Who's in the house", itemLabel: "Name", default: ["Sam", "Alex", "Jo"], maxItems: 8, itemMax: 24 }),
  chores: list({ label: "Starting chores", itemLabel: "Chore", default: ["Dishes", "Bins out"], maxItems: 20, itemMax: 40 }),
  accent: color({ label: "Color", default: "#0f766e", role: "accent" }),
  weekStartsMonday: toggle({ label: "Week starts on Monday", default: true }),
  scoring: choice({ label: "Score with", options: ["Stars", "Points", "Nothing"], default: "Stars" }),
  goal: number({ label: "Weekly goal", default: 10, min: 0, max: 100, step: 5 }),
});
```

| Kind | Value | Limits |
| --- | --- | --- |
| `text` | a line of text | `max` up to 80 characters (40 if not given). One may have `role: "title"` |
| `number` | a number | `min` and `max` within ±999,999; optional `step` |
| `list` | a starting list of short entries | `maxItems` up to 20, `itemMax` up to 60 characters |
| `color` | `#rrggbb`, lower case | One may have `role: "accent"` |
| `toggle` | on or off | |
| `choice` | one of `options` | 2 to 8 options, each up to 30 characters |

At most 12 settings. Keys are camelCase letters and digits, starting with a lower-case letter.
Labels are up to 40 characters, in plain words, as a person would read them on a form. Defaults
are **sample content**, never anyone's real details, and must fit their own limits:
`defineConfig` throws on anything over a limit, so `npm run build` fails rather than the app.

## Reading settings

In a client component:

```tsx
"use client";
import { appConfig } from "@/app/config";
import { useAppConfig } from "@/lib/config/react";

export function ChartHeader() {
  const { title, people } = useAppConfig(appConfig);
  return <h1 className="text-3xl font-semibold">{title}</h1>;
}
```

The starting list is the seed, read with `currentConfig` in `lib/db.ts`, so a fresh copy starts
with its own list:

```ts
import { currentConfig } from "@/lib/config/runtime";
import { appConfig } from "@/app/config";

seed: {
  tables: ["chores"],
  run: async (db) => {
    const { chores } = currentConfig(appConfig);
    await db.chores.bulkAdd(chores.map((name, order) => ({ id: crypto.randomUUID(), name, order })));
  },
},
```

Rules:

- **Read every value `app/config.ts` declares through `useAppConfig(appConfig)`** (or
  `currentConfig(appConfig)` in the seed). Never type a declared value into the page a second time.
- **Never read a setting in a server component.** The server never sees the link's settings, so a
  copy would show the default there. `useAppConfig` returns the defaults during server rendering
  and hydration and the copy's values on the next render; that is expected.
- **Render values only as text.** Never put one in `dangerouslySetInnerHTML`, a URL, or a style
  string you build by hand.
- **The starting list applies only to a fresh copy.** It is a seed: changing it later does not
  touch rows someone already has.
- **Roles apply themselves.** The `title` role sets the browser tab's title for a copy, and the
  `accent` role sets `--primary` (with a readable `--primary-foreground` and `--ring`). Use the
  theme's `primary` classes and the color follows.
- `useCopy(appConfig)` says whether this is somebody's copy (`isCopy`) and whether this is its
  first open (`firstOpen`). The first-open message is already shown for you; use these only when
  the page itself should differ.

## Changing settings once the app is live

Settings are part of what people already have: their links and copies carry them. **Add a new key;
never rename or remove one.** A renamed key silently falls back to its default for everyone who
set it. Changing a default is fine: copies that never changed that setting get the new default.

## What never goes in settings

A web address, an email address or a phone number; anything private; anything that changes what
is saved or sent; more than 12 settings. Text that looks like a web address, an email address or a
phone number is refused when a link is read, and the default shows instead, because anyone can
craft a link to this app and it must never show somebody else's contact details as if they were
the app's.

## How copies work

The first open of a link with settings makes a copy in that browser and rewrites the address to
`#k=<copy id>&c=<settings>`, so a bookmark or a home-screen icon comes back to it. Opening the same
link again on that device lands in the same copy; on another device it makes a copy of its own,
because the data never left the first one. The plain address in a new tab is the original, with
the defaults; a tab that opened a copy stays in it across reloads and links without the settings. The first open shows a short notice that what is saved stays in this browser
(`components/copy-boot.tsx`); there is nothing to build for it.

## Storage in a copy

`lib/storage/` gives each copy its own database; nothing to do. A `localStorage` or
`sessionStorage` key goes through `copyKey()` from `lib/storage/copy.ts`, or it is shared by the
original and every copy. See `docs/storage.md`, "Copies". Copies separate data; they do not
protect it, so never call a copy private.

## What the build check does with it

The check opens the app with every setting changed in the link, reloads it, then opens the plain
address. It reports, on a CONFIG line, which test values appeared on the page, whether they were
still there after the reload, whether the plain address still shows the defaults, and whether
anything was stored outside the copy. A setting whose test value never appeared is read somewhere
without `useAppConfig`; a key written outside the copy needs `copyKey()`.
