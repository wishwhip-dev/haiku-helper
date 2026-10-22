/**
 * Reading and writing haikus. Components call these, never Dexie directly (docs/storage.md).
 */
import { database, newId, type Haiku } from "@/lib/db";

/** How many haikus the list keeps: saving one more drops the oldest off. */
export const HAIKU_LIMIT = 10;

const haikus = async () => (await database.ready()).haikus;

/** The ten most recent haikus, newest first. */
export async function listRecentHaikus(): Promise<Haiku[]> {
  return (await haikus()).orderBy("createdAt").reverse().limit(HAIKU_LIMIT).toArray();
}

/**
 * Save a haiku and keep the list at ten: whatever falls past the newest ten is deleted. Returns
 * the saved record (with its id and time filled in) so the caller can offer an undo.
 */
export async function saveHaiku(input: Pick<Haiku, "topic" | "lines" | "tone">): Promise<Haiku> {
  const table = await haikus();
  const saved: Haiku = { id: newId(), createdAt: Date.now(), ...input };
  await table.put(saved);
  const stale = await table.orderBy("createdAt").reverse().offset(HAIKU_LIMIT).primaryKeys();
  if (stale.length) await table.bulkDelete(stale);
  return saved;
}

/** Restore a whole record, undo's way back in. Does not prune — undo never drops anything else. */
export async function putHaiku(haiku: Haiku): Promise<void> {
  await (await haikus()).put(haiku);
}

/** Delete one haiku by id. Gone for good once the undo toast has expired. */
export async function deleteHaiku(id: string): Promise<void> {
  await (await haikus()).delete(id);
}
