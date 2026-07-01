export {};

declare global {
  // Minimal Cloudflare Pages Function signature (full types added in Phase 4).
  type PagesFunction<Env = unknown> = (context: {
    request: Request;
    env: Env;
    params: Record<string, string>;
    waitUntil: (p: Promise<unknown>) => void;
  }) => Response | Promise<Response>;
}
