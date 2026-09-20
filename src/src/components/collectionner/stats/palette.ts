import * as React from 'react';

const LIGHT = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
  '#4a3aa7',
  '#e34948',
];
const DARK = [
  '#3987e5',
  '#d95926',
  '#199e70',
  '#c98500',
  '#d55181',
  '#008300',
  '#9085e9',
  '#e66767',
];

export interface ChartPalette {
  series: string[];
  jellyfin: string;
  muted: string;
}

const isLightTheme = () =>
  document.documentElement.classList.contains('theme-light');

export function useChartPalette(): ChartPalette {
  const [light, setLight] = React.useState(isLightTheme);
  React.useEffect(() => {
    const observer = new MutationObserver(() => setLight(isLightTheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);
  return React.useMemo(
    () => ({
      series: light ? LIGHT : DARK,
      jellyfin: '#00a4dc',
      muted: light ? '#9a9a96' : '#6f6f6b',
    }),
    [light]
  );
}
