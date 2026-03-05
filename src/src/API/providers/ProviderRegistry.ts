import { IProvider } from './IProvider.ts';

//import { MarvelProvider } from "./MarvelProvider.ts";
import { AnilistProvider } from './AnilistProvider.ts';
import { OpenLibraryProvider } from './OpenLibraryProvider.ts';
import { GoogleBooksProvider } from './GoogleBooksProvider.ts';
import { ManualProvider } from './ManualProvider.ts';
import { MarvelUnlimitedProvider } from './MarvelUnlimitedProvider.ts';
import { MetronProvider } from './MetronProvider.ts';
import { MangaDexProvider } from './MangaDexProvider.ts';
import { GetComicsProvider } from './GetComicsProvider.ts';
import { DCInfiniteProvider } from './DCInfiniteProvider.ts';
import { VizProvider } from './VizProvider.ts';

/**
 * Central registry for all API providers.
 *
 * ┌─────────────────────────────────────────────────────┐
 * │  HOW TO ADD A NEW PROVIDER:                         │
 * │                                                     │
 * │  1. Create a new file, e.g. MyProvider.ts           │
 * │     that exports a class implementing IProvider     │
 * │  2. Import it here                                  │
 * │  3. Add `new MyProvider()` to the `providers` array │
 * │  4. That's it – every part of the app will pick     │
 * │     it up automatically.                            │
 * └─────────────────────────────────────────────────────┘
 */

const providers: IProvider[] = [
  new ManualProvider(),
  // new MarvelProvider(), // Temporarily disabled due to API shutdown
  new AnilistProvider(),
  new OpenLibraryProvider(),
  new GoogleBooksProvider(),
  new MarvelUnlimitedProvider(),
  new MetronProvider(),
  new MangaDexProvider(),
  new GetComicsProvider(),
  new DCInfiniteProvider(),
  new VizProvider(),
];

const providerById = new Map<number, IProvider>();
const providerByBadge = new Map<string, IProvider>();

for (const p of providers) {
  providerById.set(p.id, p);
  providerByBadge.set(p.badgeName, p);
}

/** Get a provider by its numeric ID. Returns undefined if not found. */
export function getProvider(id: number | string): IProvider | undefined {
  const numId = typeof id === 'string' ? parseInt(id, 10) : id;
  if (isNaN(numId)) return undefined;
  return providerById.get(numId);
}

/** Get a provider and throw if not found. */
export function getProviderOrThrow(id: number | string): IProvider {
  const p = getProvider(id);
  if (!p) throw new Error(`Unknown provider ID: ${id}`);
  return p;
}

/** Get a provider by its badge name. */
export function getProviderByBadge(badge: string): IProvider | undefined {
  return providerByBadge.get(badge);
}

/** Get all registered providers. */
export function getAllProviders(): readonly IProvider[] {
  return providers;
}

/** Get all providers that are selectable (i.e. can appear in the provider dropdown). */
export function getSelectableProviders(): readonly IProvider[] {
  return providers;
}

// Re-export the interface for convenience
export type { IProvider } from './IProvider.ts';
export { createFallbackBook } from './IProvider.ts';
