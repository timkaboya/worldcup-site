import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { withBase } from '../lib/base';
import {
  isValidAmount,
  isValidEmail,
  loadPaystack,
  paystackConfig,
  toSubunit,
} from '../lib/paystack';

type Status = 'idle' | 'opening' | 'verifying' | 'success' | 'error';

// Quick-pick amounts per currency (major units). Falls back to a generic set.
const PRESETS: Record<string, number[]> = {
  NGN: [500, 1000, 2000, 5000],
  KES: [100, 250, 500, 1000],
  GHS: [10, 25, 50, 100],
  ZAR: [20, 50, 100, 200],
  USD: [3, 5, 10, 20],
};

async function verifyPayment(reference: string): Promise<boolean> {
  try {
    const r = await fetch(withBase('/api/verify-payment'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reference }),
    });
    if (!r.ok) return false;
    const j = (await r.json()) as { verified?: boolean };
    return !!j.verified;
  } catch {
    return false;
  }
}

export default function Support() {
  const cfg = useMemo(() => paystackConfig(), []);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [msg, setMsg] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const presets = (cfg && PRESETS[cfg.currency]) || [3, 5, 10, 20];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  // No key configured → render nothing (safe no-op build).
  if (!cfg) return null;

  function close() {
    setOpen(false);
    setStatus('idle');
    setMsg('');
  }

  const canDonate = isValidEmail(email) && isValidAmount(amount) && status !== 'opening' && status !== 'verifying';

  async function donate() {
    if (!cfg || !canDonate) return;
    setStatus('opening');
    setMsg('');
    try {
      const PaystackPop = await loadPaystack();
      const popup = new PaystackPop();
      popup.newTransaction({
        key: cfg.key,
        email: email.trim(),
        amount: toSubunit(amount),
        currency: cfg.currency,
        onSuccess: async (tx: { reference: string }) => {
          setStatus('verifying');
          const verified = await verifyPayment(tx.reference);
          setStatus('success');
          setMsg(
            verified
              ? 'Payment confirmed — thank you for supporting the project! ⚽'
              : 'Thanks so much for your support! ⚽ (Reference: ' + tx.reference + ')'
          );
        },
        onCancel: () => {
          setStatus('idle');
          setMsg('Payment window closed — no charge was made.');
        },
      });
    } catch {
      setStatus('error');
      setMsg('Could not start the payment. Please try again.');
    }
  }

  return (
    <>
      <button class="support-btn" type="button" onClick={() => setOpen(true)}>
        <span aria-hidden="true">☕</span> Support this project
      </button>

      {open && (
        <div class="drawer-overlay" onClick={close} role="dialog" aria-modal="true" aria-label="Support this project">
          <div
            class="drawer support-modal"
            ref={panelRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div class="drawer-grab" aria-hidden="true" />
            <button class="drawer-close" onClick={close} aria-label="Close">✕</button>

            {status === 'success' ? (
              <div class="support-done">
                <div class="support-emoji" aria-hidden="true">🎉</div>
                <h2 class="support-title">Thank you!</h2>
                <p class="support-msg">{msg}</p>
                <button class="support-cta" type="button" onClick={close}>Close</button>
              </div>
            ) : (
              <>
                <h2 class="support-title">☕ Buy me a coffee</h2>
                <p class="support-sub">
                  This is a free, ad-free World Cup companion. If it’s useful, chip in
                  to help cover hosting — any amount is appreciated.
                </p>

                <label class="support-label" for="sup-email">Your email (for the receipt)</label>
                <input
                  id="sup-email"
                  class="support-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onInput={(e) => setEmail((e.target as HTMLInputElement).value)}
                />

                <div class="support-label">Amount ({cfg.currency})</div>
                <div class="support-presets">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      class={`support-chip${String(p) === amount ? ' active' : ''}`}
                      onClick={() => setAmount(String(p))}
                    >
                      {cfg.currency} {p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <input
                  class="support-input"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="decimal"
                  placeholder={`Custom amount in ${cfg.currency}`}
                  value={amount}
                  onInput={(e) => setAmount((e.target as HTMLInputElement).value)}
                />

                <button class="support-cta" type="button" disabled={!canDonate} onClick={donate}>
                  {status === 'opening'
                    ? 'Opening…'
                    : status === 'verifying'
                    ? 'Confirming…'
                    : 'Donate securely'}
                </button>
                {msg && <p class={`support-note${status === 'error' ? ' err' : ''}`}>{msg}</p>}
                <p class="support-secure">🔒 Secured by Paystack. Cards, bank & mobile money.</p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
