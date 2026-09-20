import * as React from 'react';

const SAMPLE_EDGE = 360;
const BACKGROUND_TOLERANCE = 34;
const MIN_CONTENT_PIXELS = 2;
const PADDING = 0.006;
const MAX_CACHE = 10;

const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function cropMargins(src: string): Promise<string | null> {
  const image = await loadImage(src);
  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) return null;

  const ratio = Math.min(1, SAMPLE_EDGE / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * ratio));
  const sh = Math.max(1, Math.round(height * ratio));
  const sample = document.createElement('canvas');
  sample.width = sw;
  sample.height = sh;
  const context = sample.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(image, 0, 0, sw, sh);
  const { data } = context.getImageData(0, 0, sw, sh);

  const corner = (x: number, y: number) => (y * sw + x) * 4;
  const corners = [
    corner(0, 0),
    corner(sw - 1, 0),
    corner(0, sh - 1),
    corner(sw - 1, sh - 1),
  ];
  const bg = [0, 1, 2].map(
    (channel) =>
      corners.reduce((sum, at) => sum + data[at + channel], 0) / corners.length
  );
  const isContent = (x: number, y: number) => {
    const at = corner(x, y);
    return (
      Math.max(
        Math.abs(data[at] - bg[0]),
        Math.abs(data[at + 1] - bg[1]),
        Math.abs(data[at + 2] - bg[2])
      ) > BACKGROUND_TOLERANCE
    );
  };

  const rowHasContent = (y: number) => {
    let hits = 0;
    for (let x = 0; x < sw; x++)
      if (isContent(x, y) && ++hits >= MIN_CONTENT_PIXELS) return true;
    return false;
  };
  const columnHasContent = (x: number) => {
    let hits = 0;
    for (let y = 0; y < sh; y++)
      if (isContent(x, y) && ++hits >= MIN_CONTENT_PIXELS) return true;
    return false;
  };

  let top = 0;
  while (top < sh && !rowHasContent(top)) top++;
  let bottom = sh - 1;
  while (bottom > top && !rowHasContent(bottom)) bottom--;
  let left = 0;
  while (left < sw && !columnHasContent(left)) left++;
  let right = sw - 1;
  while (right > left && !columnHasContent(right)) right--;
  if (top >= bottom || left >= right) return null;

  const pad = Math.round(Math.max(sw, sh) * PADDING);
  const x0 = Math.max(0, left - pad) / sw;
  const y0 = Math.max(0, top - pad) / sh;
  const x1 = Math.min(sw, right + 1 + pad) / sw;
  const y1 = Math.min(sh, bottom + 1 + pad) / sh;
  const keptArea = (x1 - x0) * (y1 - y0);
  if (keptArea > 0.96 || keptArea < 0.35) return null;

  const cw = Math.round((x1 - x0) * width);
  const ch = Math.round((y1 - y0) * height);
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const outContext = out.getContext('2d');
  if (!outContext) return null;
  outContext.drawImage(
    image,
    Math.round(x0 * width),
    Math.round(y0 * height),
    cw,
    ch,
    0,
    0,
    cw,
    ch
  );
  const blob = await new Promise<Blob | null>((resolve) =>
    out.toBlob(resolve, 'image/jpeg', 0.92)
  );
  return blob ? URL.createObjectURL(blob) : null;
}

function remember(src: string, value: string | null) {
  cache.set(src, value);
  while (cache.size > MAX_CACHE) {
    const [oldest, url] = cache.entries().next().value as [
      string,
      string | null,
    ];
    cache.delete(oldest);
    if (url) URL.revokeObjectURL(url);
  }
}

export function prefetchCropped(src: string | null | undefined) {
  if (!src || cache.has(src)) return;
  ensureCropped(src);
}

function ensureCropped(src: string): Promise<string | null> {
  let task = inflight.get(src);
  if (!task) {
    task = cropMargins(src)
      .catch(() => null)
      .then((url) => {
        remember(src, url);
        inflight.delete(src);
        return url;
      });
    inflight.set(src, task);
  }
  return task;
}

export function useCroppedSrc(
  src: string | null | undefined,
  enabled: boolean
): string | null {
  const [, force] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    if (!enabled || !src || cache.has(src)) return;
    let alive = true;
    const task = ensureCropped(src);
    task.then(() => alive && force());
    return () => {
      alive = false;
    };
  }, [src, enabled]);

  if (!src) return null;
  return (enabled && cache.get(src)) || src;
}
