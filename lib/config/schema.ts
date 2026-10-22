/**
 * GENERATED FILE — do not edit here.
 *
 * Vendored from the supervisor repository's `packages/app-config` at version 0.1.0.
 * A later copy of the package replaces this file, so an edit made here is lost.
 * This app's own settings belong in app/config.ts.
 */
/**
 * Per-person settings: what a person can change to make an app theirs without a new build.
 *
 * An application declares a few settings in `app/config.ts` (a title, a few labels, a color, a
 * starting list, a few options). Anyone can then open the live app with their own values in the
 * link's fragment (`#c=<settings>`) and use it as their own copy, with its own data in their own
 * browser (`lib/storage/copy.ts`). Nothing is built and nothing reaches a server.
 *
 * This file is pure: no browser, no React, no dependency. It is imported by the application, by
 * the gallery's form and by the supervisor, so every one of them applies the same limits:
 *
 * - `defineConfig` throws on a schema that breaks a limit, so `npm run build` fails at the agent's
 *   desk rather than in somebody's browser.
 * - `parseConfigSchema` reads an application's served schema strictly; nothing that reads one
 *   trusts it.
 * - `validateOverrides` checks every value against the schema on every read: unknown keys are
 *   dropped, an invalid value falls back to its default, and text is cleaned.
 * - `encodeSettings` / `decodeSettings` are the fragment's codec, with the size caps applied
 *   before anything is decoded.
 *
 * There is deliberately no web address, image, email or HTML kind, and text that looks like a
 * contact detail is refused (`looksLikeContact`): anyone can craft a link to a listed app, and the
 * app must never be made to show somebody else's phone number or "log in here" address.
 */

/** The version of the settings envelope and of the served schema. */
export const CONFIG_FORMAT_VERSION = 1;

export const LIMITS = Object.freeze({
  /** Settings in one schema. */
  fields: 12,
  /** Characters in a key. Keys match `KEY_PATTERN`. */
  keyMax: 24,
  /** Characters in a label (and a list's item label). */
  label: 40,
  /** The largest `max` a text setting may declare, and the default when it declares none. */
  textMax: 80,
  textDefaultMax: 40,
  /** Items in a list, and characters in one item. */
  listItems: 20,
  listItemMax: 60,
  /** Options in a choice, and characters in one option. */
  choiceOptionsMin: 2,
  choiceOptionsMax: 8,
  choiceOptionMax: 30,
  /**
   * The largest magnitude a number setting may hold. Six digits: a seven-digit run reads as a
   * phone number to the contact filter, and a number setting is not where one goes either.
   */
  numberMagnitude: 999_999,
  /** Characters in the `c` fragment value. A longer one is not decoded at all. */
  encodedChars: 2048,
  /** UTF-8 bytes of the decoded settings JSON. */
  decodedBytes: 1536,
  /** UTF-8 bytes of a served schema's JSON. */
  schemaBytes: 4096,
});

export const KEY_PATTERN = /^[a-z][a-zA-Z0-9]{0,23}$/;
const COLOR_PATTERN = /^#[0-9a-f]{6}$/;

// ---------------------------------------------------------------------------------------------
// Field kinds
// ---------------------------------------------------------------------------------------------

export type TextField = {
  kind: "text";
  label: string;
  default: string;
  /** Characters. At most 80; 40 when not given. */
  max: number;
  /** At most one text setting is the title: it is applied to the tab's title too. */
  role?: "title";
};

export type NumberField = {
  kind: "number";
  label: string;
  default: number;
  min: number;
  max: number;
  /** When given, a value must be a whole multiple of it, counted from `min`. */
  step?: number;
};

export type ListField = {
  kind: "list";
  label: string;
  /** What one item is called: "Name", "Chore". */
  itemLabel: string;
  default: readonly string[];
  maxItems: number;
  itemMax: number;
};

export type ColorField = {
  kind: "color";
  label: string;
  /** `#rrggbb`, lower case. */
  default: string;
  /** At most one color is the accent: it is applied to `--primary`. */
  role?: "accent";
};

export type ToggleField = {
  kind: "toggle";
  label: string;
  default: boolean;
};

export type ChoiceField<Options extends readonly string[] = readonly string[]> = {
  kind: "choice";
  label: string;
  options: Options;
  default: Options[number];
};

export type ConfigField = TextField | NumberField | ListField | ColorField | ToggleField | ChoiceField;
export type ConfigFieldKind = ConfigField["kind"];
export type ConfigFields = Record<string, ConfigField>;

/** The value a field holds. */
export type FieldValue<F extends ConfigField> =
  F extends TextField ? string
    : F extends NumberField ? number
      : F extends ListField ? readonly string[]
        : F extends ColorField ? string
          : F extends ToggleField ? boolean
            : F extends ChoiceField<infer Options> ? Options[number]
              : never;

/** Every setting's value, by key. What `useAppConfig` and `currentConfig` return. */
export type ConfigValues<F extends ConfigFields> = { readonly [Key in keyof F]: FieldValue<F[Key]> };

export type ConfigValue = string | number | boolean | readonly string[];

/** A declared schema: the fields in declaration order, and their defaults. */
export type AppConfig<F extends ConfigFields = ConfigFields> = {
  readonly fields: Readonly<F>;
  readonly defaults: ConfigValues<F>;
};

/** One field as served and as the gallery reads it: the field with its key. */
export type ConfigFieldJson = ConfigField & { key: string };

/** What an application serves at `/app-settings.json`, from `describeConfig`. */
export type ConfigSchemaJson = { v: typeof CONFIG_FORMAT_VERSION; fields: ConfigFieldJson[] };

/** Thrown by `defineConfig` and the builders on a schema that breaks a limit. */
export class ConfigSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigSchemaError";
  }
}

/** Thrown by `encodeSettings` when the settings do not fit in one link. */
export class SettingsTooLong extends Error {
  constructor(readonly characters: number, readonly bytes: number) {
    super(`The settings need ${characters} characters (${bytes} bytes); a link holds ${LIMITS.encodedChars} (${LIMITS.decodedBytes}).`);
    this.name = "SettingsTooLong";
  }
}

// ---------------------------------------------------------------------------------------------
// Text cleaning and the contact filter
// ---------------------------------------------------------------------------------------------

/**
 * Control characters, bidirectional overrides and isolates, zero-width space, word joiner, the
 * byte-order mark and the line and paragraph separators. Zero-width joiners stay: emoji need them.
 * Checked by code point rather than with a regular expression of control characters, which lint
 * rules refuse.
 */
function isUnsafe(code: number): boolean {
  return code <= 0x1f || (code >= 0x7f && code <= 0x9f) || code === 0x200b || code === 0x200e || code === 0x200f
    || code === 0x2028 || code === 0x2029 || (code >= 0x202a && code <= 0x202e) || code === 0x2060
    || (code >= 0x2066 && code <= 0x2069) || code === 0xfeff;
}

function stripUnsafe(value: string): string {
  let result = "";
  for (const character of value) {
    const code = character.codePointAt(0)!;
    // Tabs and line breaks become spaces rather than vanishing, so "Ada\nBen" does not read "AdaBen".
    if (code === 0x09 || code === 0x0a || code === 0x0d) result += " ";
    else if (!isUnsafe(code)) result += character;
  }
  return result;
}

/** Trimmed, NFC-normalized, runs of white space made one space, hidden and control characters removed. */
export function cleanText(value: string): string {
  return stripUnsafe(value.normalize("NFC")).replace(/\s+/g, " ").trim();
}

/** Characters as a person counts them (code points), not UTF-16 units. */
function characters(value: string): number {
  return [...value].length;
}

const KNOWN_TLDS = [
  "com", "net", "org", "info", "biz", "edu", "gov", "io", "app", "dev", "co", "ai", "me", "tv", "ly", "gg",
  "xyz", "site", "online", "shop", "store", "link", "page", "click", "live", "top", "club", "web", "website",
  "uk", "us", "ca", "au", "nz", "ie", "de", "fr", "es", "it", "nl", "be", "ch", "at", "se", "no", "dk", "fi",
  "pl", "pt", "ru", "ua", "cn", "jp", "kr", "in", "br", "mx", "ar", "za", "ng", "ke", "sg", "hk", "tw", "id",
  "ph", "vn", "th", "my", "tk", "ml", "ga", "cf", "gq", "to", "sh", "so", "cc", "ws", "su", "eu", "asia",
];
const HOST_PATTERN = new RegExp(`(?:^|[^a-z0-9-])[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:${KNOWN_TLDS.join("|")})(?![a-z0-9-])`, "i");

/**
 * Whether text reads as a contact detail or an address: a URL (`://`), `www.`, a host with a known
 * top-level domain, an email address, or a run of seven or more digits (spaces, dashes, dots,
 * slashes, brackets and a plus sign ignored). Folded with NFKC first, so full-width digits and
 * look-alike dots are caught too. Ordinary names and "Room 101" pass.
 */
export function looksLikeContact(text: string): boolean {
  const folded = stripUnsafe(text.normalize("NFKC"));
  if (/:\/\//.test(folded)) return true;
  if (/\bwww\./i.test(folded)) return true;
  if (/[^\s@]+@[^\s@]+\.[^\s@]+/.test(folded)) return true;
  if (HOST_PATTERN.test(folded)) return true;
  return /\d(?:[\s.\-/()+]*\d){6,}/.test(folded);
}

// ---------------------------------------------------------------------------------------------
// Field validation, shared by the builders and the schema parser
// ---------------------------------------------------------------------------------------------

function isWhole(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function labelProblem(label: unknown, name = "label"): string | undefined {
  if (typeof label !== "string") return `its ${name} is not text`;
  const cleaned = cleanText(label);
  if (cleaned === "" || cleaned !== label) return `its ${name} is empty or has untrimmed or hidden characters`;
  if (characters(label) > LIMITS.label) return `its ${name} is longer than ${LIMITS.label} characters`;
  return undefined;
}

/** A value already in its field's limits, cleaned. Undefined when it cannot be. */
function acceptValue(field: ConfigField, raw: unknown): ConfigValue | undefined {
  switch (field.kind) {
    case "text": {
      if (typeof raw !== "string") return undefined;
      const value = cleanText(raw);
      if (characters(value) > field.max || looksLikeContact(value)) return undefined;
      return value;
    }
    case "number": {
      if (!isFiniteNumber(raw) || raw < field.min || raw > field.max) return undefined;
      if (field.step !== undefined) {
        const steps = (raw - field.min) / field.step;
        if (Math.abs(steps - Math.round(steps)) > 1e-9) return undefined;
      }
      return Object.is(raw, -0) ? 0 : raw;
    }
    case "list": {
      if (!Array.isArray(raw) || raw.length > field.maxItems * 2) return undefined;
      const items: string[] = [];
      for (const item of raw) {
        if (typeof item !== "string") return undefined;
        const value = cleanText(item);
        if (value === "") continue;
        if (characters(value) > field.itemMax || looksLikeContact(value)) return undefined;
        items.push(value);
      }
      return items.length > field.maxItems ? undefined : Object.freeze(items);
    }
    case "color": {
      if (typeof raw !== "string") return undefined;
      const value = raw.trim().toLowerCase();
      return COLOR_PATTERN.test(value) ? value : undefined;
    }
    case "toggle":
      return typeof raw === "boolean" ? raw : undefined;
    case "choice":
      return typeof raw === "string" && field.options.includes(raw) ? raw : undefined;
  }
}

/** What is wrong with a field's declaration, or undefined. */
function fieldProblem(field: unknown): string | undefined {
  if (typeof field !== "object" || field === null || Array.isArray(field)) return "it is not a field";
  const spec = field as Record<string, unknown>;
  const label = labelProblem(spec.label);
  if (label) return label;
  const allowed: Record<ConfigFieldKind, readonly string[]> = {
    text: ["kind", "label", "default", "max", "role"],
    number: ["kind", "label", "default", "min", "max", "step"],
    list: ["kind", "label", "itemLabel", "default", "maxItems", "itemMax"],
    color: ["kind", "label", "default", "role"],
    toggle: ["kind", "label", "default"],
    choice: ["kind", "label", "options", "default"],
  };
  const kind = spec.kind as ConfigFieldKind;
  if (typeof spec.kind !== "string" || !Object.hasOwn(allowed, kind)) return `its kind "${String(spec.kind)}" is not one of ${Object.keys(allowed).join(", ")}`;
  const extra = Object.keys(spec).find((name) => name !== "key" && !allowed[kind].includes(name));
  if (extra) return `it has an unknown property "${extra}"`;

  switch (kind) {
    case "text":
      if (!isWhole(spec.max) || spec.max < 1 || spec.max > LIMITS.textMax) return `its max must be a whole number from 1 to ${LIMITS.textMax}`;
      if (spec.role !== undefined && spec.role !== "title") return `its role must be "title"`;
      break;
    case "number": {
      const { min, max, step } = spec;
      if (!isFiniteNumber(min) || !isFiniteNumber(max) || min > max) return "its min and max must be numbers, min no larger than max";
      if (Math.abs(min) > LIMITS.numberMagnitude || Math.abs(max) > LIMITS.numberMagnitude) return `its min and max must be within ±${LIMITS.numberMagnitude}`;
      if (step !== undefined && (!isFiniteNumber(step) || step <= 0)) return "its step must be a positive number";
      break;
    }
    case "list": {
      const itemLabel = labelProblem(spec.itemLabel, "itemLabel");
      if (itemLabel) return itemLabel;
      if (!isWhole(spec.maxItems) || spec.maxItems < 1 || spec.maxItems > LIMITS.listItems) return `its maxItems must be a whole number from 1 to ${LIMITS.listItems}`;
      if (!isWhole(spec.itemMax) || spec.itemMax < 1 || spec.itemMax > LIMITS.listItemMax) return `its itemMax must be a whole number from 1 to ${LIMITS.listItemMax}`;
      if (!Array.isArray(spec.default)) return "its default must be a list of text";
      break;
    }
    case "color":
      if (spec.role !== undefined && spec.role !== "accent") return `its role must be "accent"`;
      break;
    case "toggle":
      break;
    case "choice": {
      const options = spec.options;
      if (!Array.isArray(options) || options.length < LIMITS.choiceOptionsMin || options.length > LIMITS.choiceOptionsMax) {
        return `it must offer ${LIMITS.choiceOptionsMin} to ${LIMITS.choiceOptionsMax} options`;
      }
      for (const option of options) {
        if (typeof option !== "string" || option === "" || cleanText(option) !== option) return "every option must be clean, non-empty text";
        if (characters(option) > LIMITS.choiceOptionMax) return `an option is longer than ${LIMITS.choiceOptionMax} characters`;
        if (looksLikeContact(option)) return "an option looks like a web address, email address or phone number";
      }
      if (new Set(options).size !== options.length) return "it offers the same option twice";
      break;
    }
  }
  const accepted = acceptValue(spec as ConfigField, spec.default);
  if (accepted === undefined || !sameValue(accepted, spec.default)) {
    return "its default is outside its own limits, has untrimmed or hidden characters, or looks like a contact detail";
  }
  return undefined;
}

function sameValue(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => item === b[index]);
  return Object.is(a, b);
}

/** What is wrong with a whole schema (fields by key, in order), or undefined. */
function schemaProblem(entries: readonly (readonly [string, unknown])[]): string | undefined {
  if (entries.length > LIMITS.fields) return `it declares ${entries.length} settings; at most ${LIMITS.fields}`;
  const seen = new Set<string>();
  let titles = 0;
  let accents = 0;
  for (const [key, field] of entries) {
    if (!KEY_PATTERN.test(key)) return `the key "${key}" must match ${KEY_PATTERN}`;
    if (seen.has(key)) return `the key "${key}" is declared twice`;
    seen.add(key);
    const problem = fieldProblem(field);
    if (problem) return `the setting "${key}": ${problem}`;
    const role = (field as { role?: string }).role;
    if (role === "title") titles += 1;
    if (role === "accent") accents += 1;
  }
  if (titles > 1) return `${titles} settings have the title role; at most one`;
  if (accents > 1) return `${accents} settings have the accent role; at most one`;
  return undefined;
}

// ---------------------------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------------------------

function checked<F extends ConfigField>(field: F): F {
  const problem = fieldProblem(field);
  if (problem) throw new ConfigSchemaError(`A ${field.kind} setting labeled "${String(field.label)}": ${problem}.`);
  return Object.freeze(field);
}

/** A line of text: a title, a heading, a label. */
export function text(options: { label: string; default: string; max?: number; role?: "title" }): TextField {
  return checked({ kind: "text", label: options.label, default: options.default, max: options.max ?? LIMITS.textDefaultMax, ...(options.role ? { role: options.role } : {}) });
}

/** A number within `min`..`max`, optionally in steps. */
export function number(options: { label: string; default: number; min: number; max: number; step?: number }): NumberField {
  return checked({ kind: "number", label: options.label, default: options.default, min: options.min, max: options.max, ...(options.step === undefined ? {} : { step: options.step }) });
}

/** A starting list of short entries. Used by the seed, so it applies only to a fresh copy. */
export function list(options: { label: string; itemLabel: string; default: readonly string[]; maxItems?: number; itemMax?: number }): ListField {
  return checked({
    kind: "list",
    label: options.label,
    itemLabel: options.itemLabel,
    default: Object.freeze([...options.default]),
    maxItems: options.maxItems ?? LIMITS.listItems,
    itemMax: options.itemMax ?? 40,
  });
}

/** A color, `#rrggbb`. */
export function color(options: { label: string; default: string; role?: "accent" }): ColorField {
  return checked({ kind: "color", label: options.label, default: options.default, ...(options.role ? { role: options.role } : {}) });
}

/** An on/off option. */
export function toggle(options: { label: string; default: boolean }): ToggleField {
  return checked({ kind: "toggle", label: options.label, default: options.default });
}

/** One of a few fixed options. */
export function choice<const Options extends readonly string[]>(options: { label: string; options: Options; default: Options[number] }): ChoiceField<Options> {
  return checked({ kind: "choice", label: options.label, options: Object.freeze([...options.options]) as unknown as Options, default: options.default });
}

/**
 * Declare an application's settings. Throws `ConfigSchemaError` on anything over a limit, so a bad
 * schema fails the build rather than somebody's first open.
 */
export function defineConfig<const F extends ConfigFields>(fields: F): AppConfig<F> {
  const entries = Object.entries(fields);
  const problem = schemaProblem(entries);
  if (problem) throw new ConfigSchemaError(`app/config.ts: ${problem}.`);
  const defaults: Record<string, ConfigValue> = {};
  for (const [key, field] of entries) defaults[key] = field.default;
  const config = Object.freeze({ fields: Object.freeze({ ...fields }), defaults: Object.freeze(defaults) as ConfigValues<F> });
  // The served form must pass `parseConfigSchema`, or the gallery would never see these settings.
  const bytes = utf8Length(JSON.stringify(describeConfig(config)));
  if (bytes > LIMITS.schemaBytes) throw new ConfigSchemaError(`app/config.ts: the settings describe to ${bytes} bytes; at most ${LIMITS.schemaBytes}. Shorten the labels or the starting lists.`);
  return config;
}

// ---------------------------------------------------------------------------------------------
// Served schema
// ---------------------------------------------------------------------------------------------

/** Either form a reader may hold: the declared config, or a served schema already parsed. */
export type ConfigSource = AppConfig | ConfigSchemaJson;

function fieldEntries(source: ConfigSource): (readonly [string, ConfigField])[] {
  if ("v" in source) return source.fields.map(({ key, ...field }) => [key, field as ConfigField] as const);
  return Object.entries(source.fields);
}

/** The schema as served at `/app-settings.json`. Reveals nothing the live app does not show. */
export function describeConfig(config: AppConfig): ConfigSchemaJson {
  return {
    v: CONFIG_FORMAT_VERSION,
    fields: Object.entries(config.fields).map(([key, field]) => ({ key, ...field, ...(field.kind === "list" ? { default: [...field.default] } : {}), ...(field.kind === "choice" ? { options: [...field.options] } : {}) }) as ConfigFieldJson),
  };
}

/**
 * A served schema read strictly: anything over a limit, of an unknown kind, or larger than 4 KB is
 * refused whole. The panel and the supervisor never trust an application's JSON.
 */
export function parseConfigSchema(json: unknown): ConfigSchemaJson | undefined {
  try {
    const value: unknown = typeof json === "string" ? JSON.parse(json) : json;
    const serialized = JSON.stringify(value);
    if (serialized === undefined || utf8Length(serialized) > LIMITS.schemaBytes) return undefined;
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    const { v, fields, ...rest } = value as Record<string, unknown>;
    if (v !== CONFIG_FORMAT_VERSION || !Array.isArray(fields) || Object.keys(rest).length > 0) return undefined;
    const entries: (readonly [string, unknown])[] = [];
    for (const field of fields) {
      if (typeof field !== "object" || field === null || typeof (field as { key?: unknown }).key !== "string") return undefined;
      entries.push([(field as { key: string }).key, field]);
    }
    if (schemaProblem(entries)) return undefined;
    // Rebuilt from the checked fields, so nothing but what was checked comes through.
    return JSON.parse(serialized) as ConfigSchemaJson;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------------------------

export type ValidatedSettings = {
  /** Every setting: the override where it was valid, the default otherwise. */
  values: Record<string, ConfigValue>;
  /** Only the valid values that differ from their defaults: what a link needs to carry. */
  overrides: Record<string, ConfigValue>;
  /** Keys that were given but dropped: unknown, or invalid and so back to their default. */
  dropped: string[];
};

/**
 * Check overrides against a schema. Unknown keys are dropped; an invalid value (wrong type, over a
 * limit, or looking like a contact detail) falls back to its default; text is cleaned. Never throws.
 */
export function validateOverrides(source: ConfigSource, raw: unknown): ValidatedSettings {
  const entries = fieldEntries(source);
  const given = typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const values: Record<string, ConfigValue> = {};
  const overrides: Record<string, ConfigValue> = {};
  const dropped: string[] = [];
  const known = new Set<string>();
  for (const [key, field] of entries) {
    known.add(key);
    values[key] = field.default;
    if (!Object.hasOwn(given, key)) continue;
    const accepted = acceptValue(field, given[key]);
    if (accepted === undefined) {
      dropped.push(key);
      continue;
    }
    values[key] = accepted;
    if (!sameValue(accepted, field.default)) overrides[key] = accepted;
  }
  for (const key of Object.keys(given)) if (!known.has(key)) dropped.push(key);
  return { values, overrides, dropped };
}

function utf8Length(text: string): number {
  return new TextEncoder().encode(text).length;
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string | undefined {
  if (!/^[A-Za-z0-9_-]*$/.test(value) || value.length % 4 === 1) return undefined;
  try {
    const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "="));
    if (binary.length > LIMITS.decodedBytes) return undefined;
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

/**
 * The `c` value for a set of overrides: URL-safe base64 of `{"v":1,"o":{…}}`, no padding, holding
 * only the valid values that differ from their defaults, in the schema's order (so the same
 * settings always make the same link, and so the same copy). Throws `SettingsTooLong` past the caps.
 */
export function encodeSettings(source: ConfigSource, overrides: Record<string, unknown>): string {
  const { overrides: valid } = validateOverrides(source, overrides);
  const json = JSON.stringify({ v: CONFIG_FORMAT_VERSION, o: valid });
  const encoded = toBase64Url(json);
  const bytes = utf8Length(json);
  if (encoded.length > LIMITS.encodedChars || bytes > LIMITS.decodedBytes) throw new SettingsTooLong(encoded.length, bytes);
  return encoded;
}

export type DecodedSettings =
  | { ok: true; overrides: Record<string, unknown> }
  | { ok: false; reason: "too-long" | "unreadable" | "wrong-version" };

/**
 * Read a `c` value: URL-safe base64 of the envelope, or the envelope written as plain JSON
 * (percent-encoded or not). A value over the character cap is refused before anything decodes it.
 * The overrides are not validated here; pass them to `validateOverrides`. Never throws.
 */
export function decodeSettings(encoded: string): DecodedSettings {
  if (typeof encoded !== "string") return { ok: false, reason: "unreadable" };
  if (encoded.length > LIMITS.encodedChars) return { ok: false, reason: "too-long" };
  let json: string | undefined;
  if (/^(\{|%7b)/i.test(encoded)) {
    try {
      json = decodeURIComponent(encoded);
    } catch {
      return { ok: false, reason: "unreadable" };
    }
    if (utf8Length(json) > LIMITS.decodedBytes) return { ok: false, reason: "too-long" };
  } else {
    json = fromBase64Url(encoded);
  }
  if (json === undefined) return { ok: false, reason: "unreadable" };
  let envelope: unknown;
  try {
    envelope = JSON.parse(json);
  } catch {
    return { ok: false, reason: "unreadable" };
  }
  if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) return { ok: false, reason: "unreadable" };
  const { v, o } = envelope as { v?: unknown; o?: unknown };
  if (v !== CONFIG_FORMAT_VERSION) return { ok: false, reason: "wrong-version" };
  if (o !== undefined && (typeof o !== "object" || o === null || Array.isArray(o))) return { ok: false, reason: "unreadable" };
  return { ok: true, overrides: (o ?? {}) as Record<string, unknown> };
}

// ---------------------------------------------------------------------------------------------
// Test values for the build check
// ---------------------------------------------------------------------------------------------

const PROBE_LETTERS = "abcdefghjkmnpqrstvwxyz";

function probeToken(key: string, index: number): string {
  let hash = 0x811c9dc5;
  for (const character of `${key}:${index}`) hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193) >>> 0;
  let token = "";
  for (let position = 0; position < 4; position += 1) token += PROBE_LETTERS[(hash >>> (position * 5)) % PROBE_LETTERS.length];
  return token;
}

function fit(value: string, max: number): string {
  return [...value].slice(0, max).join("").trim();
}

/**
 * A changed value for every setting, within every limit: a unique short token per text setting,
 * two items per list, a contrasting color, the flipped toggle, another choice, another number.
 * The build check opens the app with these in the link and looks for them on the page.
 */
export function probeOverrides(source: ConfigSource): Record<string, ConfigValue> {
  const result: Record<string, ConfigValue> = {};
  fieldEntries(source).forEach(([key, field], index) => {
    switch (field.kind) {
      case "text": {
        const token = probeToken(key, index);
        const long = `Probe ${key} ${token}`;
        result[key] = characters(long) <= field.max && !looksLikeContact(long) ? long : fit(`P${token}`, field.max);
        break;
      }
      case "number": {
        const candidate = field.max !== field.default ? field.max : field.min;
        result[key] = candidate;
        break;
      }
      case "list": {
        const count = Math.min(2, field.maxItems);
        const items: string[] = [];
        for (let item = 0; item < count; item += 1) {
          const token = probeToken(key, index * 10 + item + 1);
          items.push(characters(`Item ${token}`) <= field.itemMax ? `Item ${token}` : fit(token, field.itemMax));
        }
        result[key] = items;
        break;
      }
      case "color":
        result[key] = contrasting(field.default);
        break;
      case "toggle":
        result[key] = !field.default;
        break;
      case "choice":
        result[key] = field.options[1] !== field.default ? field.options[1]! : field.options[0]!;
        break;
    }
  });
  return result;
}

function contrasting(hex: string): string {
  const red = Number.parseInt(hex.slice(1, 3), 16);
  const green = Number.parseInt(hex.slice(3, 5), 16);
  const blue = Number.parseInt(hex.slice(5, 7), 16);
  // A warm magenta, unless the default is already reddish; then a clear blue.
  return red > green && red > blue ? "#1f6feb" : "#b4235a";
}
