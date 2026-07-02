// Paystack Inline integration helpers — small, pure, and testable.
// Only the PUBLIC key ever reaches the browser (safe to expose). The secret key
// lives solely as a Cloudflare env var and is used server-side in
// functions/api/verify-payment.ts.

export interface PaystackConfig {
  key: string;
  currency: string;
}

/**
 * Read the build-time public Paystack config from Astro/Vite env.
 * Returns null when no key is configured, so the Support button can hide itself
 * and a keyless build stays a safe no-op.
 */
export function paystackConfig(): PaystackConfig | null {
  // NOTE: reference `import.meta.env.PUBLIC_*` directly (no aliasing) so Vite
  // statically inlines the literal values into the client bundle at build time.
  const key = String(import.meta.env.PUBLIC_PAYSTACK_KEY ?? '').trim();
  if (!key) return null;
  const currency =
    String(import.meta.env.PUBLIC_PAYSTACK_CURRENCY ?? 'NGN').trim().toUpperCase() || 'NGN';
  return { key, currency };
}

/** Minimal but practical email check (client-side convenience only). */
export function isValidEmail(email: string): boolean {
  const e = (email ?? '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * Convert a major-unit amount (e.g. 500 naira) to the integer subunit Paystack
 * expects (kobo/pesewas/cents = amount × 100). Returns 0 for invalid input so
 * callers can reject it before opening the popup.
 */
export function toSubunit(amount: number | string): number {
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

/** True when the amount is a usable, positive donation value. */
export function isValidAmount(amount: number | string): boolean {
  return toSubunit(amount) > 0;
}

const SDK_URL = 'https://js.paystack.co/v2/inline.js';
let sdkPromise: Promise<any> | null = null;

/**
 * Lazily inject the Paystack Inline SDK on first use (kept off the critical path
 * so it only downloads if a visitor actually chooses to donate). Resolves with
 * the global `PaystackPop` constructor. Safe to call repeatedly — the script is
 * injected at most once.
 */
export function loadPaystack(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  const w = window as any;
  if (w.PaystackPop) return Promise.resolve(w.PaystackPop);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_URL}"]`);
    const onload = () => (w.PaystackPop ? resolve(w.PaystackPop) : reject(new Error('Paystack SDK missing')));
    if (existing) {
      existing.addEventListener('load', onload, { once: true });
      existing.addEventListener('error', () => reject(new Error('Paystack SDK failed')), { once: true });
      if (w.PaystackPop) resolve(w.PaystackPop);
      return;
    }
    const s = document.createElement('script');
    s.src = SDK_URL;
    s.async = true;
    s.onload = onload;
    s.onerror = () => {
      sdkPromise = null; // allow a retry on next click
      reject(new Error('Paystack SDK failed to load'));
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}
