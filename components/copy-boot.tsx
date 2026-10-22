"use client";

import { useEffect, useSyncExternalStore } from "react";

import { appConfig } from "@/app/config";
import { Button } from "@/components/ui/button";
import { applyRoles, configStatus, currentConfig } from "@/lib/config/runtime";

// Opens this page load as somebody's own copy when its link carries settings (`#c=…`, read by
// lib/storage/copy.ts and lib/config/runtime.ts): sets the two roles that apply themselves (the
// title on the tab, a changed color on the theme's `--primary`), and on a copy's first open says
// once, in the app's own theme, where its data stays. Renders nothing on the original.
// Mounted once in app/providers.tsx. Do not edit, move or remove it; see docs/config.md.

/** The one notice, on the page load that made the copy. */
export const COPY_NOTICE = "Your copy: what you save here stays in this browser.";
/** How long the notice stays when nobody closes it. */
const NOTICE_MS = 8000;

let shown = false;
let open = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function close(): void {
  if (!open) return;
  open = false;
  emit();
}

/** The title setting's default and this copy's own title, when the copy changed it. */
function copyTitle(): { from: string; to: string } | null {
  if (!configStatus(appConfig).isCopy) return null;
  const values: Record<string, unknown> = currentConfig(appConfig);
  for (const [key, field] of Object.entries(appConfig.fields)) {
    if (field.kind !== "text" || field.role !== "title") continue;
    const value = values[key];
    return typeof value === "string" && value !== "" && value !== field.default ? { from: field.default, to: value } : null;
  }
  return null;
}

let watching = false;

/**
 * Keeps a copy's title on the tab. Next.js writes the page's `<title>` from its metadata after the
 * page has started (and again on every navigation), which puts the app's own name back; so the
 * name is swapped for the copy's wherever it appears ("Settings · Chore chart" becomes
 * "Settings · Okafor chores"). Once per page load.
 */
function keepTitle(): void {
  const title = copyTitle();
  if (watching || !title || typeof MutationObserver === "undefined") return;
  watching = true;
  const swap = () => {
    const current = document.title;
    if (current.includes(title.from) && !current.includes(title.to)) document.title = current.split(title.from).join(title.to);
  };
  try {
    new MutationObserver(swap).observe(document.head, { childList: true, subtree: true, characterData: true });
  } catch {
    // No head to watch: the title applyRoles set stays until the framework replaces it.
  }
  swap();
}

/**
 * Applies the roles, and opens the notice on a copy's first open: once per page load, however often
 * it is called (a remount calls it again). Returns whether this call opened the notice.
 */
export function bootCopy(): boolean {
  applyRoles(appConfig);
  keepTitle();
  if (shown || !configStatus(appConfig).firstOpen) return false;
  shown = true;
  open = true;
  emit();
  return true;
}

export function CopyBoot() {
  const visible = useSyncExternalStore(subscribe, () => open, () => false);

  useEffect(() => {
    bootCopy();
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(close, NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-safe">
      <div
        role="status"
        aria-live="polite"
        data-copy-notice=""
        className="pointer-events-auto mt-4 flex w-full max-w-md items-center gap-3 rounded-lg border border-border bg-card p-3 pl-4 text-sm text-card-foreground shadow-lg"
      >
        <p className="flex-1">{COPY_NOTICE}</p>
        <Button type="button" variant="ghost" className="min-h-11" onClick={close}>OK</Button>
      </div>
    </div>
  );
}
