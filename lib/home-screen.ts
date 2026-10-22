/**
 * The home-screen module's decisions, kept apart from React so they can be tested: which phone this
 * is, whether the app is already running from the home screen, whether to offer the one-time card,
 * and what it says. `components/home-screen.tsx` and `components/install-card.tsx` use these.
 * Do not edit; see docs/home-screen.md.
 */

/**
 * Where the card can help. `ios-safari` adds to the home screen from the Share menu; `android` can
 * offer the browser's own install dialog once it has sent `beforeinstallprompt`. Everything else
 * (a computer, another iPhone browser, an app's built-in browser) gets no card.
 */
export type InstallPlatform = "ios-safari" | "android" | "other";

/** An iPad on iPadOS 13 and later says "Macintosh"; its touch screen gives it away. */
function isIos(userAgent: string, maxTouchPoints: number): boolean {
  return /\b(?:iPhone|iPad|iPod)\b/.test(userAgent) || (/\bMacintosh\b/.test(userAgent) && maxTouchPoints > 1);
}

/** Other iPhone browsers and the browsers built into apps, which cannot add to the home screen the Safari way. */
const NOT_SAFARI = /\b(?:CriOS|FxiOS|EdgiOS|OPiOS|OPT|GSA|DuckDuckGo|YaBrowser|FBAN|FBAV|FB_IAB|Instagram|Line|LinkedInApp|Twitter|MicroMessenger|Snapchat|Pinterest|TikTok|musical_ly)\b/;

export function platformOf(userAgent: string, maxTouchPoints: number): InstallPlatform {
  if (isIos(userAgent, maxTouchPoints)) {
    // An app's built-in browser usually drops the "Safari/" token as well.
    return /\bSafari\//.test(userAgent) && !NOT_SAFARI.test(userAgent) ? "ios-safari" : "other";
  }
  // Android's in-app browsers ("; wv)") never send `beforeinstallprompt`, so they never get a card.
  if (/\bAndroid\b/.test(userAgent)) return "android";
  return "other";
}

type DisplayWindow = {
  matchMedia?: (query: string) => { matches: boolean };
  /** Safari on iOS adds `standalone` to its navigator; no type of the DOM's declares it. */
  navigator?: unknown;
};

/** Whether the app is running from the home screen (or as an installed app on a computer). */
export function isStandalone(win: DisplayWindow): boolean {
  try {
    if ((win.navigator as { standalone?: unknown } | undefined)?.standalone === true) return true;
    return Boolean(win.matchMedia?.("(display-mode: standalone)").matches || win.matchMedia?.("(display-mode: fullscreen)").matches);
  } catch {
    return false;
  }
}

/** What the card needs to know about this visit. */
export type Visit = {
  platform: InstallPlatform;
  /** `(pointer: coarse)`: a finger, not a mouse. */
  coarsePointer: boolean;
  standalone: boolean;
  /** Inside another page's frame. */
  framed: boolean;
  /** `navigator.webdriver`: a browser driven by a program, never a person. */
  automated: boolean;
  /** The card was already shown in this browser. */
  offered: boolean;
  /** Android only: the browser sent `beforeinstallprompt` and it is being held. */
  canPrompt: boolean;
};

/** Whether this visit gets the card: once per browser, on a phone, when it can say something true. */
export function shouldOffer(visit: Visit): boolean {
  if (visit.offered || visit.standalone || visit.framed || visit.automated || !visit.coarsePointer) return false;
  if (visit.platform === "ios-safari") return true;
  if (visit.platform === "android") return visit.canPrompt;
  return false;
}

export type CardStep = { text: string; shareIcon?: true };

export type CardContent =
  | { kind: "steps"; heading: string; lead: string; steps: CardStep[]; note: string; dismiss: string }
  | { kind: "install"; heading: string; lead: string; install: string; dismiss: string };

/**
 * The card's words. The app's name is the only name in it. No button starts with "Add", "New" or
 * "Create", and none says delete, remove, clear, reset or the like: those words mean something to
 * the app's own controls, and the card must never be mistaken for one.
 */
export function cardFor(platform: InstallPlatform, canPrompt: boolean, name: string): CardContent | null {
  if (platform === "ios-safari") {
    return {
      kind: "steps",
      heading: `Put ${name} on your home screen`,
      lead: "It opens full screen, like an app, and works without a connection.",
      steps: [
        { text: "Tap the Share button in Safari's toolbar.", shareIcon: true },
        { text: "Scroll down and tap “Add to Home Screen”." },
        { text: `Tap “Add”, then open ${name} from your home screen.` },
      ],
      note: `What you save here in Safari stays in Safari, so start using ${name} from your home screen.`,
      dismiss: "Got it",
    };
  }
  if (platform === "android" && canPrompt) {
    return {
      kind: "install",
      heading: `Put ${name} on your home screen`,
      lead: "It gets its own icon, opens full screen and works without a connection.",
      install: "Install",
      dismiss: "Not now",
    };
  }
  return null;
}

/** Where this browser remembers that the card was shown. Not the app's data: one flag, nothing else. */
export const OFFERED_KEY = "home-screen.offered";

type FlagStorage = Pick<Storage, "getItem" | "setItem">;

export function wasOffered(storage: FlagStorage | undefined): boolean {
  try {
    return storage?.getItem(OFFERED_KEY) === "1";
  } catch {
    // Storage that cannot be read: treat the card as shown rather than show it on every visit.
    return true;
  }
}

export function markOffered(storage: FlagStorage | undefined): void {
  try {
    storage?.setItem(OFFERED_KEY, "1");
  } catch {
    // Nothing to do: the card simply may show again.
  }
}

/**
 * The same-origin files the page has loaded so far that are worth keeping offline: its scripts,
 * styles and fonts under /_next/static/, its icons and its manifest. Handed to the offline copy
 * (`public/sw.js`) once it controls the page, so what loaded before it took over is kept too.
 */
export function warmList(entries: readonly { name: string }[], origin: string): string[] {
  const urls = new Set<string>();
  for (const entry of entries) {
    let url: URL;
    try {
      url = new URL(entry.name);
    } catch {
      continue;
    }
    if (url.origin !== origin) continue;
    const path = url.pathname + url.search;
    if (/^\/(?:_next\/static\/|icon\b|apple-icon\b|manifest\.webmanifest$)/.test(url.pathname)) urls.add(path);
    if (urls.size >= 200) break;
  }
  return [...urls];
}

type PersistNavigator = { userAgent?: string; storage?: { persist?: () => Promise<boolean>; persisted?: () => Promise<boolean> } };

/**
 * Asks once, from the home screen, that the browser keep this app's data when the device is low on
 * space. Chrome and Safari decide without asking the person; Firefox would show a prompt, so it is
 * never asked there. Resolves whatever happens.
 */
export async function keepStorage(nav: PersistNavigator, standalone: boolean): Promise<void> {
  if (!standalone || /\bFirefox\//.test(nav.userAgent ?? "")) return;
  try {
    if (!nav.storage?.persist || (await nav.storage.persisted?.())) return;
    await nav.storage.persist();
  } catch {
    // Not available: the data stays as it was.
  }
}
