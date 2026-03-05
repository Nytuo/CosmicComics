export type { IProvider, ISearchResult } from './IProvider.ts';
export { createFallbackBook } from './IProvider.ts';
export {
  getProvider,
  getProviderOrThrow,
  getProviderByBadge,
  getAllProviders,
  getSelectableProviders,
} from './ProviderRegistry.ts';

export { ManualProvider } from './ManualProvider.ts';
export { MarvelProvider } from './MarvelProvider.ts';
export { AnilistProvider } from './AnilistProvider.ts';
export { OpenLibraryProvider } from './OpenLibraryProvider.ts';
export { GoogleBooksProvider } from './GoogleBooksProvider.ts';
export { MarvelUnlimitedProvider } from './MarvelUnlimitedProvider.ts';
export { MetronProvider } from './MetronProvider.ts';
export { MangaDexProvider } from './MangaDexProvider.ts';
export { GetComicsProvider } from './GetComicsProvider.ts';
export { DCInfiniteProvider } from './DCInfiniteProvider.ts';
export { VizProvider } from './VizProvider.ts';
