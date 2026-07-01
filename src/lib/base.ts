// Base-path helper so the app works both at the site root (Cloudflare Worker)
// and under a GitHub Pages project subpath (e.g. /worldcup-site/).
// `import.meta.env.BASE_URL` is injected by Astro/Vite from `base` in
// astro.config.mjs and always ends with a trailing slash.
export const BASE_URL: string = (import.meta.env.BASE_URL as string) || '/';

/** Join an absolute-from-root path (e.g. "/news.json") onto the configured base. */
export function withBase(path: string): string {
  const b = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  return path.startsWith('/') ? b + path : `${b}/${path}`;
}
