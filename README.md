# Haiku helper

A haiku helper: I type a topic and it writes a three-line haiku about it, and keeps the last ten haikus in a list.

This app is yours: run it, host it anywhere, change it. It was made with WishWhip.

## Run it

It is a Next.js app and needs Node 22:

```bash
npm install
npm run dev
```

Then open http://localhost:3000. `npm run build` makes the version to host, and it runs anywhere
Next.js runs.

## Where things are

- `app/identity.ts`: the name, the one-line description and the colour. The page title, the icons
  and the picture a shared link shows all read it.
- `app/globals.css`: the colours, the corner radius and the fonts, in one place. Its first comment
  describes the look.
- `AGENTS.md`: notes for AI coding assistants that work on this code. Safe to keep or delete.
