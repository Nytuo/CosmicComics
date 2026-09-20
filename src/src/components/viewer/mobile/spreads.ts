/**
 * Groups page indexes into what is on screen at once: one page, or two when
 * spreads are on. With `coverAlone` the cover stands by itself and the rest
 * are paired (1+2, 3+4…), like a printed book.
 */
export function buildGroups(
  total: number,
  spread: boolean,
  coverAlone: boolean
): number[][] {
  if (!spread) return Array.from({ length: total }, (_, i) => [i]);
  const groups: number[][] = [];
  let page = 0;
  if (coverAlone && total > 0) {
    groups.push([0]);
    page = 1;
  }
  for (; page < total; page += 2) {
    groups.push(page + 1 < total ? [page, page + 1] : [page]);
  }
  return groups;
}

export function groupOf(groups: number[][], page: number): number {
  const found = groups.findIndex((g) => g.includes(page));
  return found >= 0 ? found : groups.length;
}
