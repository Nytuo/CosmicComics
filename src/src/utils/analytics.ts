import { invoke } from '@tauri-apps/api/core';
import { trackError, trackEvent } from '@aptabase/tauri';

// Opt-in only (usage counts and error reports). The choice is stored by the backend (analytics.json) and
// nothing is sent while it is missing or false.
let usage = false;
let errors = false;
let listening = false;

// File paths can hold user and book names: keep the error, drop the paths.
const PATH = /(?:[A-Za-z]:\\|\/)[^\s'"`)]+/g;

/** Reports an error to the Errors page, with paths stripped from its text. */
export function reportError(error: unknown, fatal = false): void {
  if (!errors) return;
  const source = error instanceof Error ? error : new Error(String(error));
  const clean = new Error(source.message.replace(PATH, '<path>'));
  clean.name = source.name;
  clean.stack = source.stack?.replace(PATH, '<path>');
  trackError(clean, { fatal }).catch(() => {});
}

function listenForErrors() {
  if (listening) return;
  listening = true;
  window.addEventListener('error', (e) => {
    if (e.error) reportError(e.error);
  });
  window.addEventListener('unhandledrejection', (e) => reportError(e.reason));
}

export type AnalyticsConsent = { usage: boolean; errors: boolean };

function apply(consent: AnalyticsConsent) {
  usage = consent.usage;
  errors = consent.errors;
  if (errors) listenForErrors();
}

/** `null` while the user has not been asked yet. */
export async function getAnalyticsConsent(): Promise<AnalyticsConsent | null> {
  try {
    const consent = await invoke<AnalyticsConsent | null>(
      'get_analytics_consent'
    );
    if (consent) apply(consent);
    return consent;
  } catch {
    return null;
  }
}

export async function setAnalyticsConsent(
  consent: AnalyticsConsent
): Promise<void> {
  await invoke('set_analytics_consent', { ...consent });
  apply(consent);
}

export function track(
  name: string,
  props?: Record<string, string | number>
): void {
  if (!usage) return;
  trackEvent(name, props).catch(() => {});
}
