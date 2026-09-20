import * as TauriAPI from '@/API/TauriAPI';
import { readJellyfinSession } from '@/API/JellyfinAPI';
import type { SessionMeta } from '@/API/StatsAPI';

const extensionOf = (path: string) =>
  path.split('.').pop()?.toLowerCase() ?? '';

export async function resolveSessionMeta(
  bookPath: string
): Promise<SessionMeta> {
  const jellyfin = readJellyfinSession();
  if (jellyfin) {
    return {
      source: 'jellyfin',
      serverId: jellyfin.serverId,
      bookRef: `jf:${jellyfin.serverId}:${jellyfin.itemId}`,
      title: jellyfin.title,
      seriesTitle: jellyfin.seriesName ?? undefined,
      format: jellyfin.format ?? extensionOf(bookPath),
    };
  }
  const [book] = await TauriAPI.getBooksByPath(bookPath).catch(() => []);
  if (book) {
    const series = book.series_id
      ? await TauriAPI.getSeriesById(book.series_id).catch(() => null)
      : null;
    return {
      source: 'local',
      bookRef: book.id,
      title: book.title,
      seriesTitle: series?.title,
      format: book.format || extensionOf(bookPath),
    };
  }
  return {
    source: 'local',
    bookRef: `file:${bookPath}`,
    title: bookPath.split(/[\\/]/).pop() ?? bookPath,
    format: extensionOf(bookPath),
  };
}
