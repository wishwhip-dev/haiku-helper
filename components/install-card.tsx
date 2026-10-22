"use client";

import { useEffect, useSyncExternalStore } from "react";

import { identity } from "@/app/identity";
import { Button } from "@/components/ui/button";
import { cardFor, type CardContent, isStandalone, markOffered, platformOf, shouldOffer, wasOffered } from "@/lib/home-screen";

// The one-time "put it on your home screen" card, on phones only: the Share-menu steps in Safari on
// an iPhone or iPad, the browser's own install dialog on Android. Shown once per browser, never
// from the home screen, never in a frame. Rendered by <HomeScreen />; do not edit, move or restyle
// it, and add no install prompt of your own (docs/home-screen.md).

/** On an iPhone the card waits a moment, so the page is seen first. */
const IOS_DELAY_MS = 4000;

type InstallPromptEvent = Event & { prompt: () => Promise<unknown> };

let held: InstallPromptEvent | null = null;
let card: CardContent | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function inFrame(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function coarsePointer(): boolean {
  try {
    return window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

/** The card for this visit, or null when it has nothing true to say here. */
function cardForThisVisit(canPrompt: boolean): CardContent | null {
  const nav = navigator as Navigator & { standalone?: boolean };
  const platform = platformOf(nav.userAgent, nav.maxTouchPoints ?? 0);
  const offer = shouldOffer({
    platform,
    coarsePointer: coarsePointer(),
    standalone: isStandalone(window),
    framed: inFrame(),
    automated: nav.webdriver === true,
    offered: wasOffered(browserStorage()),
    canPrompt,
  });
  return offer ? cardFor(platform, canPrompt, identity.name) : null;
}

function show(content: CardContent | null): void {
  if (!content || card) return;
  card = content;
  // Once per browser: remembered as soon as it is shown, whatever the person does with it.
  markOffered(browserStorage());
  emit();
}

function close(): void {
  card = null;
  emit();
}

if (typeof window !== "undefined") {
  // Android sends this once the app can be installed, often before the page has finished loading,
  // so it is listened for here rather than after the component mounts. Held (and the browser's own
  // banner held back) only when the card will offer it.
  window.addEventListener("beforeinstallprompt", (event) => {
    const content = cardForThisVisit(true);
    if (!content) return;
    event.preventDefault();
    held = event as InstallPromptEvent;
    show(content);
  });
  window.addEventListener("appinstalled", () => {
    held = null;
    markOffered(browserStorage());
    close();
  });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function install(): Promise<void> {
  const event = held;
  held = null;
  close();
  try {
    await event?.prompt();
  } catch {
    // The dialog could not open; the card is gone either way.
  }
}

function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-1 inline size-4 align-text-bottom" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m8 7 4-4 4 4" />
      <path d="M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1" />
    </svg>
  );
}

export function InstallCard() {
  const content = useSyncExternalStore(subscribe, () => card, () => null);

  useEffect(() => {
    const timer = window.setTimeout(() => show(cardForThisVisit(false)), IOS_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!content) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-safe">
      <div role="region" aria-label={content.heading} className="pointer-events-auto mb-4 flex w-full max-w-md flex-col gap-3 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground shadow-lg">
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold">{content.heading}</p>
          <p className="text-muted-foreground">{content.lead}</p>
        </div>
        {content.kind === "steps" ? (
          <>
            <ol className="flex list-decimal flex-col gap-1 pl-5">
              {content.steps.map((step) => (
                <li key={step.text}>
                  {step.text}
                  {step.shareIcon ? <ShareIcon /> : null}
                </li>
              ))}
            </ol>
            <p className="text-muted-foreground">{content.note}</p>
            <div className="flex justify-end">
              <Button type="button" className="min-h-11" onClick={close}>{content.dismiss}</Button>
            </div>
          </>
        ) : (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" className="min-h-11" onClick={close}>{content.dismiss}</Button>
            <Button type="button" className="min-h-11" onClick={() => void install()}>{content.install}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
