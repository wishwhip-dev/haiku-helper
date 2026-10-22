"use client";

import { useState, type FormEvent } from "react";
import { appConfig } from "@/app/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShareButton } from "@/components/share-button";
import { database, type Haiku, type HaikuTone } from "@/lib/db";
import { deleteHaiku, listRecentHaikus, putHaiku, saveHaiku, HAIKU_LIMIT } from "@/lib/data/haikus";
import { AI_PRIVACY_NOTE, useAsk, type AskResult } from "@/lib/ai";
import { useAppConfig } from "@/lib/config/react";
import { renderShareCard } from "@/lib/share";
import { useStorageStatus, useStoredQuery } from "@/lib/storage/react";
import { toast } from "sonner";
import { Info } from "lucide-react";

/** Three lines: the shape a haiku takes everywhere in this file. */
type HaikuLines = Haiku["lines"];

/** How each tone reads inside the request, and the one line the model is asked to work in. */
const TONE_WORDS: Record<HaikuTone, string> = {
  Classic: "traditional and serene",
  Playful: "light and playful",
  Melancholy: "quietly melancholy",
};

const dateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" });

function formatDate(milliseconds: number): string {
  return dateFormatter.format(new Date(milliseconds));
}

/** Five sample haikus: the example repeats the first `count`, so the answer always has that many. */
const SAMPLE_LINES: HaikuLines[] = [
  ["First snow on the sill,", "the kettle warms the quiet,", "footprints fill with light."],
  ["A crow lifts the dusk,", "streetlamps come on one by one,", "the day folds its wings."],
  ["Rain writes on the glass,", "each drop a slow short sentence,", "the window reads on."],
  ["Low tide leaves the bay,", "gulls argue over empty shells,", "the moon takes the floor."],
  ["Wind turns every leaf,", "the whole tree learns a new word,", "then says it out loud."],
];

/** One request for however many haikus were chosen — never one call per haiku. */
function buildRequest(topic: string, tone: HaikuTone, count: number) {
  return {
    input: `Write ${count} haiku${count === 1 ? "" : "s"} about: ${topic}`,
    options: {
      system:
        "You write haikus. Answer with JSON: an object with a `haikus` array of exactly " +
        `${count} haiku${count === 1 ? "" : "s"}, each an object with a \`lines\` array of exactly ` +
        "three short lines and nothing else: no titles, no punctuation after the lines, no " +
        "commentary. Aim for a 5-7-5 syllable feel. " +
        `The tone is ${TONE_WORDS[tone]}.`,
      json: true,
      example: { haikus: SAMPLE_LINES.slice(0, count).map((lines) => ({ lines })) },
      maxTokens: 500,
      temperature: 0.9,
    },
  } as const;
}

function isThreeLines(data: unknown): data is { lines: [string, string, string] } {
  if (!data || typeof data !== "object") return false;
  const lines = (data as { lines?: unknown }).lines;
  return (
    Array.isArray(lines) &&
    lines.length === 3 &&
    lines.every((line) => typeof line === "string" && line.trim().length > 0)
  );
}

/**
 * The answer read as the batch that was asked for. Extra haikus beyond `count` are dropped; fewer
 * than asked for is a failure, because the page promised this many.
 */
function readHaikuBatch(data: unknown, count: number): HaikuLines[] | null {
  if (!data || typeof data !== "object") return null;
  const haikus = (data as { haikus?: unknown }).haikus;
  if (!Array.isArray(haikus)) return null;
  const batch = haikus
    .slice(0, count)
    .filter(isThreeLines)
    .map((haiku) => haiku.lines as HaikuLines);
  return batch.length === count ? batch : null;
}

/** The message a failed call leaves on the page. Offline gets its own honest wording. */
function failureText(result: Extract<AskResult, { ok: false }>): string {
  if (result.reason === "offline") {
    return "Writing a haiku needs the internet. Check your connection and try again.";
  }
  return result.message;
}

export function HaikuStudio() {
  const { heading, topicLabel, tone } = useAppConfig(appConfig);
  const requestTone: HaikuTone = tone === "Playful" ? "Playful" : tone === "Melancholy" ? "Melancholy" : "Classic";

  const [topic, setTopic] = useState("");
  const [topicProblem, setTopicProblem] = useState("");
  const [count, setCount] = useState(1);
  const [fresh, setFresh] = useState<Haiku[]>([]);
  const [outcome, setOutcome] = useState<{ kind: "thinking" | "failed"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const { ask, busy } = useAsk();

  const storageStatus = useStorageStatus(database);
  const { data: saved, isLoading } = useStoredQuery(database, listRecentHaikus);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = topic.trim();
    if (!trimmed) {
      setFresh([]);
      setOutcome(null);
      setTopicProblem("Enter a topic first — what should the haiku be about?");
      return;
    }
    setTopicProblem("");
    setFresh([]);
    setOutcome({ kind: "thinking", text: "Thinking…" });

    const request = buildRequest(trimmed, requestTone, count);
    const result = await ask(request.input, request.options);
    if (!result.ok) {
      setOutcome({ kind: "failed", text: failureText(result) });
      return;
    }
    const batch = readHaikuBatch(result.data, count);
    if (!batch) {
      setOutcome({ kind: "failed", text: `The assistant's answer couldn't be read as ${count} haiku${count === 1 ? "" : "s"}. Try again.` });
      return;
    }

    setOutcome(null);
    setSaving(true);
    const stored: Haiku[] = [];
    try {
      for (const lines of batch) {
        stored.push(await saveHaiku({ topic: trimmed, lines, tone: requestTone }));
      }
      setFresh(stored);
      toast.success(count === 1 ? "Haiku saved" : `${count} haikus saved`);
    } catch (error) {
      // The haikus were still written, so they stay on the page; the unsaved ones get a temporary
      // id and the toast says what went wrong. Nothing here reaches the list.
      const at = Date.now();
      setFresh(batch.map((lines, index) => stored[index] ?? { id: `unsaved-${index}`, topic: trimmed, lines, tone: requestTone, createdAt: at }));
      toast.error(`Could not save the haiku${count === 1 ? "" : "s"}: ${error instanceof Error ? error.message : "unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (victim: Haiku) => {
    try {
      await deleteHaiku(victim.id);
      toast("Haiku deleted", {
        action: {
          label: "Undo",
          onClick: () => {
            void putHaiku(victim).catch((error: unknown) =>
              toast.error(`Could not restore the haiku: ${error instanceof Error ? error.message : "unknown error"}`),
            );
          },
        },
      });
    } catch (error) {
      toast.error(`Could not delete the haiku: ${error instanceof Error ? error.message : "unknown error"}`);
    }
  };

  return (
    <main className="mx-auto min-h-dvh w-full max-w-xl px-4 pb-safe pt-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{heading}</h1>
        <p className="mt-1 text-muted-foreground">
          Type a topic and get up to five haikus at once. The last {HAIKU_LIMIT} stay on this device.
        </p>
      </header>

      {storageStatus === "memory" ? (
        <p role="status" className="mb-4 rounded-md border border-border bg-secondary px-3 py-2 text-sm">
          This browser won&apos;t keep your haikus. Anything you write lasts only until this tab closes.
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            New haiku
            <Badge variant="secondary">{requestTone}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="haiku-topic">{topicLabel}</Label>
              <Input
                id="haiku-topic"
                name="topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="e.g. first snow"
                autoComplete="off"
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">{AI_PRIVACY_NOTE}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <Label>How many</Label>
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="What “How many” means"
                          className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <Info className="size-4" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        How many haikus to write in one go, from 1 to 5. Each one is saved to your list.
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                <span className="text-sm tabular-nums text-muted-foreground">{count} of 5</span>
              </div>
              <Slider
                min={1}
                max={5}
                step={1}
                value={[count]}
                onValueChange={(value) => setCount(value[0] ?? 1)}
                aria-label="How many haikus to write"
              />
            </div>
            {topicProblem ? (
              <p role="alert" className="text-sm text-destructive">
                {topicProblem}
              </p>
            ) : null}
            <Button type="submit" disabled={busy || saving} className="w-full sm:w-auto">
              Write haiku
            </Button>
          </form>
        </CardContent>
      </Card>

      <section aria-live="polite" className="mt-6">
        {outcome ? (
          <p role="status" className={outcome.kind === "failed" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
            {outcome.text}
          </p>
        ) : null}
        {fresh.map((entry) => (
          <HaikuCard key={entry.id} haiku={entry} fresh />
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Your haikus</h2>
          {saved?.length ? <Badge variant="secondary">{saved.length}</Badge> : null}
        </div>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-36 w-full" />
          </div>
        ) : saved && saved.length > 0 ? (
          <ol className="space-y-3">
            {saved.map((entry) => (
              <li key={entry.id}>
                <HaikuCard haiku={entry} onDelete={() => handleDelete(entry)} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">No haikus yet.</p>
        )}
      </section>
    </main>
  );
}

/** One haiku: topic as heading, the three lines, and its actions. */
function HaikuCard({ haiku, fresh = false, onDelete }: { haiku: Haiku; fresh?: boolean; onDelete?: () => void }) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(haiku.lines.join("\n"));
      toast.success("Haiku copied to the clipboard");
    } catch {
      toast.error("Could not copy: the clipboard isn't available here.");
    }
  };

  return (
    <Card className={fresh ? "border-primary/40" : undefined}>
      <CardContent className="space-y-3">
        <div>
          <h3 className="text-lg font-medium leading-snug">{haiku.topic}</h3>
          <p className="text-xs text-muted-foreground">
            Written {formatDate(haiku.createdAt)}
            {fresh ? " · just now" : ""}
          </p>
        </div>
        <blockquote className="border-l-2 border-border pl-4 text-base leading-relaxed">
          {haiku.lines.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
        </blockquote>
        <div className="flex flex-wrap items-start gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
            Copy
          </Button>
          <ShareButton
            label="Share"
            title={`${haiku.topic} — a haiku`}
            text={`A haiku about ${haiku.topic}`}
            filename="haiku.png"
            cacheKey={haiku.id}
            makeImage={() =>
              renderShareCard({
                title: haiku.topic,
                lines: haiku.lines,
                format: "square",
              })
            }
          />
          {onDelete ? (
            <Button type="button" variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              Delete
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}