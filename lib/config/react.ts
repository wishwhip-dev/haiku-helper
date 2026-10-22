"use client";

/**
 * GENERATED FILE — do not edit here.
 *
 * Vendored from the supervisor repository's `packages/app-config` at version 0.1.0.
 * A later copy of the package replaces this file, so an edit made here is lost.
 * This app's own settings belong in app/config.ts.
 */
/**
 * The React side: the settings for this page load, in a client component.
 *
 * The server renders every component too, and the server never sees a fragment, so it always
 * renders the defaults. These hooks hand React the defaults as the server snapshot, so hydration
 * matches, and the copy's values arrive on the very next render. Never read a setting from a
 * server component: a copy would show the default there.
 */
import { useSyncExternalStore } from "react";
import { configStatus, currentConfig, subscribeConfig, type ConfigStatus } from "./runtime";
import type { AppConfig, ConfigFields, ConfigValues } from "./schema";

const SERVER_STATUS: ConfigStatus = Object.freeze({ isCopy: false, firstOpen: false, dropped: Object.freeze([]), unreadable: false });

/** Every setting's value: the copy's where it set one, the default otherwise. */
export function useAppConfig<F extends ConfigFields>(config: AppConfig<F>): ConfigValues<F> {
  return useSyncExternalStore(
    subscribeConfig,
    () => currentConfig(config),
    () => config.defaults,
  );
}

/**
 * Whether this page load is somebody's own copy, whether this is its first open, and what the link
 * left out. `isCopy` is false on the server and during hydration.
 */
export function useCopy(config: AppConfig): ConfigStatus {
  return useSyncExternalStore(
    subscribeConfig,
    () => configStatus(config),
    () => SERVER_STATUS,
  );
}
