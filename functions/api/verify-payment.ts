// Cloudflare Pages Function: POST /api/verify-payment
// Confirms a Paystack transaction server-side using the SECRET key, so a
// "thank you" is only shown for a genuinely successful charge. The secret key
// is provided via the Cloudflare environment (PAYSTACK_SECRET_KEY) and is NEVER
// committed to the repo. On GitHub Pages (no functions) this route 404s and the
// client falls back to Paystack's own inline success callback.

interface Env {
  PAYSTACK_SECRET_KEY?: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const json = (v: unknown, status = 200) =>
    new Response(JSON.stringify(v), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });

  const secret = env.PAYSTACK_SECRET_KEY;
  if (!secret) return json({ verified: false, error: 'not configured' }, 501);

  let reference = '';
  try {
    const body = (await request.json()) as { reference?: string };
    reference = String(body?.reference ?? '').trim();
  } catch {
    return json({ verified: false, error: 'invalid body' }, 400);
  }
  if (!/^[\w.=-]+$/.test(reference)) {
    return json({ verified: false, error: 'invalid reference' }, 400);
  }

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { signal: ctrl.signal, headers: { authorization: `Bearer ${secret}` } }
    );
    const data = (await r.json()) as {
      status?: boolean;
      data?: { status?: string; amount?: number; currency?: string };
    };
    const ok = data?.status === true && data?.data?.status === 'success';
    return json({
      verified: ok,
      amount: ok ? data.data?.amount : undefined,
      currency: ok ? data.data?.currency : undefined,
    });
  } catch {
    return json({ verified: false, error: 'upstream unavailable' }, 502);
  } finally {
    clearTimeout(t);
  }
};
