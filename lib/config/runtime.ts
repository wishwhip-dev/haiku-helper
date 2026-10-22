/**
 * GENERATED FILE — do not edit here.
 *
 * Vendored from the supervisor repository's `packages/app-config` at version 0.1.0.
 * A later copy of the package replaces this file, so an edit made here is lost.
 * This app's own settings belong in app/config.ts.
 */
/**
 * Reading the settings in the browser: which values this page load uses, and applying the two
 * roles that set themselves.
 *
 * The copy itself (which one this page load is, its database, its stored settings) belongs to
 * `lib/storage/copy.ts`. This file reads that copy's settings string, decodes it and checks every
 * value against the schema on every read, so a crafted, damaged or outdated link can only ever
 * fall back to defaults. Nothing here throws, and nothing here sends anything anywhere.
 *
 * On the server, and on the original, every value is its default.
 */
import { activeCopy, copySettings, labelCopy, subscribeCopies, type CopyResolution } from "@/lib/storage/copy";
import {
  decodeSettings,
  validateOverrides,
  type AppConfig,
  type ConfigFields,
  type ConfigValues,
} from "./schema";

/** What this page load is and what became of its link's settings. */
export type ConfigStatus = {
  /** True when this page load is somebody's own copy rather than the original. */
  isCopy: boolean;
  /** The copy's id, for a copy. */
  copyId?: string;
  /** True only on the page load that created this copy on this device: show the first-open message. */
  firstOpen: boolean;
  /** How the copy was reached: its link, a reload in the same tab, or the home-screen icon. */
  via?: "link" | "tab" | "home-screen";
  /** Settings the link gave that were left out (unknown, or invalid and so back to their default). */
  dropped: readonly string[];
  /** The link's settings could not be read at all (too long, damaged, or a newer format). */
  unreadable: boolean;
};

export type ResolvedConfig<F extends ConfigFields> = {
  values: ConfigValues<F>;
  status: ConfigStatus;
};

const ORIGINAL_STATUS: ConfigStatus = Object.freeze({ isCopy: false, firstOpen: false, dropped: Object.freeze([]), unreadable: false });

/** Cached per config and settings string, so a React snapshot is the same object until something changes. */
const cache = new WeakMap<AppConfig, { key: string; resolved: ResolvedConfig<ConfigFields> }>();

function settingsOf(resolution: CopyResolution): string | undefined {
  return resolution.kind === "copy" ? copySettings(resolution.id) : undefined;
}

function cacheKey(resolution: CopyResolution, settings: string | undefined): string {
  return resolution.kind === "copy"
    ? `copy:${resolution.id}:${resolution.created ? 1 : 0}:${resolution.via}:${settings ?? ""}`
    : `original:${resolution.unreadableLink ? 1 : 0}`;
}

function compute<F extends ConfigFields>(config: AppConfig<F>, resolution: CopyResolution, settings: string | undefined): ResolvedConfig<F> {
  if (resolution.kind === "original") {
    return {
      values: config.defaults,
      status: resolution.unreadableLink ? { ...ORIGINAL_STATUS, unreadable: true } : ORIGINAL_STATUS,
    };
  }
  const base: ConfigStatus = { isCopy: true, copyId: resolution.id, firstOpen: resolution.created, via: resolution.via, dropped: [], unreadable: false };
  if (settings === undefined) return { values: config.defaults, status: base };
  const decoded = decodeSettings(settings);
  if (!decoded.ok) return { values: config.defaults, status: { ...base, unreadable: true } };
  const validated = validateOverrides(config, decoded.overrides);
  return {
    values: Object.freeze(validated.values) as ConfigValues<F>,
    status: { ...base, dropped: Object.freeze(validated.dropped) },
  };
}

/**
 * The values and status for this page load. Synchronous; on the server, the defaults and the
 * original. The same object is returned until the copy's settings change.
 */
export function resolveConfig<F extends ConfigFields>(config: AppConfig<F>): ResolvedConfig<F> {
  if (typeof window === "undefined") return { values: config.defaults, status: ORIGINAL_STATUS };
  try {
    const resolution = activeCopy();
    const settings = settingsOf(resolution);
    const key = cacheKey(resolution, settings);
    const cached = cache.get(config);
    if (cached?.key === key) return cached.resolved as unknown as ResolvedConfig<F>;
    const resolved = compute(config, resolution, settings);
    cache.set(config, { key, resolved: resolved as unknown as ResolvedConfig<ConfigFields> });
    return resolved;
  } catch {
    return { values: config.defaults, status: ORIGINAL_STATUS };
  }
}

/**
 * Every setting's value for this page load: the copy's where it set one, the default otherwise.
 * Use it in the seed (`lib/db.ts`) and anywhere outside React; in a component use `useAppConfig`.
 */
export function currentConfig<F extends ConfigFields>(config: AppConfig<F>): ConfigValues<F> {
  return resolveConfig(config).values;
}

/** What this page load is: original or copy, first open, and what the link left out. */
export function configStatus(config: AppConfig): ConfigStatus {
  return resolveConfig(config).status;
}

/** Called when a copy's settings change in this page (a settings dialog). Returns the unsubscribe. */
export function subscribeConfig(listener: () => void): () => void {
  return subscribeCopies(listener);
}

/** Black or white, whichever reads better on a background color. */
export function readableOn(hex: string): "#000000" | "#ffffff" {
  const channel = (offset: number) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // The contrast ratio against black, compared with the one against white.
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? "#000000" : "#ffffff";
}

/**
 * Apply the two roles a copy's settings set by themselves: the title setting becomes the tab's
 * title (and the copy's name in the list of copies), and the accent color becomes `--primary`,
 * with a readable `--primary-foreground` and `--ring`. Only values the copy changed are applied,
 * so the original and a copy that kept a default look exactly as the app was built. Safe to call
 * on every mount.
 */
export function applyRoles(config: AppConfig): void {
  if (typeof document === "undefined") return;
  try {
    const { values, status } = resolveConfig(config);
    if (!status.isCopy || !status.copyId) return;
    for (const [key, field] of Object.entries(config.fields)) {
      const value = values[key];
      if (field.kind === "text" && field.role === "title" && typeof value === "string") {
        if (value !== "") labelCopy(status.copyId, value);
        if (value !== field.default && value !== "") document.title = value;
      }
      if (field.kind === "color" && field.role === "accent" && typeof value === "string" && value !== field.default) {
        const style = document.documentElement.style;
        style.setProperty("--primary", value);
        style.setProperty("--primary-foreground", readableOn(value));
        style.setProperty("--ring", value);
      }
    }
  } catch {
    // A page that refuses style or title changes still works with its defaults.
  }
}
