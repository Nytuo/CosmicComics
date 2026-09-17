import { convertFileSrc } from '@tauri-apps/api/core';

export function resolveImageUrl(
  url: string | null | undefined
): string | undefined {
  if (!url || url === 'null') {
    return '/Images/fileDefault.png';
  }

  if (url.startsWith('data:')) {
    return url;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(url)) {
    return convertFileSrc(url);
  }

  return url;
}
