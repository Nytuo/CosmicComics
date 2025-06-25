/**
 * Set the theme on the page by applying the corresponding CSS class to <html>
 */
function setTheme(theme: string) {
  const html = document.documentElement;
  const existing = Array.from(html.classList).filter((c) =>
    c.startsWith('theme-')
  );
  existing.forEach((c) => html.classList.remove(c));
  html.classList.add(`theme-${theme}`);
  localStorage.setItem('theme', theme);
}

export { setTheme };
