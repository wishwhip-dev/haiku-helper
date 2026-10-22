/**
 * This application's database.
 *
 * The reusable half of the setup is in `lib/storage/` and is not edited. This file is the half
 * that describes the product: which tables exist, what is indexed, how the schema has changed over
 * time, and what a first visit starts with.
 *
 * First release: one table of haikus. The list is deliberately empty on a first visit — the
 * product's own empty state ("No haikus yet") is what a visitor should see, so no seed is declared.
 */
import { defineDatabase } from "@/lib/storage/database";

export type HaikuTone = "Classic" | "Playful" | "Melancholy";

export type Haiku = {
  id: string;
  /** The topic the haiku was written about; shown as its heading. */
  topic: string;
  /** Exactly three lines. */
  lines: [string, string, string];
  /** The tone setting in force when it was written. */
  tone: HaikuTone;
  /** Epoch millis. Indexed, because the list is the ten most recent, newest first. */
  createdAt: number;
};

/** Ids are generated here so the data layer never depends on an auto-increment round trip. */
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const database = defineDatabase<{ haikus: Haiku }>({
  // Part of the origin's storage identity. Renaming it does not migrate anything — it points the
  // application at a different, empty database and abandons the old one in place. That is exactly
  // what you want on a first build, and never what you want afterwards.
  name: "haiku-helper",
  versions: [
    // Only the primary key and the properties queried on. `topic`, `lines` and `tone` are stored
    // but never filtered or sorted by, so indexing them would cost writes and buy nothing.
    { version: 1, stores: { haikus: "id, createdAt" } },
  ],
});
