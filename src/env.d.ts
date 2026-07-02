/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_PAYSTACK_KEY?: string;
  readonly PUBLIC_PAYSTACK_CURRENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}