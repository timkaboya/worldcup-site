// Perf budget guard: fail the build if total client JS (gzipped) exceeds budget.
// Keeps the app lightweight per the product goals. Run after `astro build`.
import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIR = 'dist/_astro';
const BUDGET_KB = 90; // total gzipped client JS

const files = (await readdir(DIR).catch(() => [])).filter((f) => f.endsWith('.js'));
if (files.length === 0) {
  console.error(`No JS found in ${DIR}. Did you run "npm run build" first?`);
  process.exit(1);
}

let total = 0;
const rows = [];
for (const f of files) {
  const buf = await readFile(join(DIR, f));
  const gz = gzipSync(buf).length;
  total += gz;
  rows.push({ f, kb: (gz / 1024).toFixed(2) });
}

rows.sort((a, b) => Number(b.kb) - Number(a.kb));
for (const r of rows) console.log(`  ${String(r.kb).padStart(7)} KB  ${r.f}`);
const totalKb = total / 1024;
console.log(`\nTotal client JS (gzip): ${totalKb.toFixed(2)} KB / ${BUDGET_KB} KB budget`);

if (totalKb > BUDGET_KB) {
  console.error(`\n✗ Perf budget exceeded by ${(totalKb - BUDGET_KB).toFixed(2)} KB.`);
  process.exit(1);
}
console.log('✓ Within perf budget.');
